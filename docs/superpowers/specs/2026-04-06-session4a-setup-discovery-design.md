# Session 4A: Smart Setup & Discovery - Design Specification

**Goal:** Transform ToastyKey from "works after setup" to "works instantly" with smart API key detection, auto-project discovery, and one-command install via `npx toastykey`.

**Architecture:** CLI-first setup wizard with progressive discovery, filesystem watching, and persistent configuration.

**Tech Stack:** Node.js, inquirer (CLI prompts), chalk (colors), ora (spinners), chokidar (file watching), open (browser launch)

---

## 1. Architecture & Components

### Component Overview

```
npx toastykey
    ↓
bin/toastykey.js (entry point)
    ↓
src/setup/SetupManager.js (orchestrator)
    ├─→ src/setup/KeyScanner.js (finds API keys)
    ├─→ src/setup/ConfigManager.js (persists preferences)
    └─→ src/setup/ProjectWatcher.js (filesystem watching)
    ↓
src/index.js (starts server as usual)
```

### New Files

**`bin/toastykey.js`** - Executable entry point
- Shebang: `#!/usr/bin/env node`
- Checks for `~/.toastykey/config.json` existence
- First run (no config) → launches SetupManager.runWizard()
- Subsequent runs → ConfigManager.load() + quickCheck() + startServer()
- Parses CLI flags: `--port`, `--no-scan`, `--config`

**`src/setup/SetupManager.js`** - Setup orchestrator
- `runWizard()`: Executes 4-step CLI wizard using inquirer
- `quickCheck()`: Scans only new/changed files on subsequent runs
- `startServer(config)`: Calls existing `src/index.js` main(config)
- `openDashboard()`: Uses `open` library to launch browser

**`src/setup/KeyScanner.js`** - Smart key detection
- `scanPaths(paths)`: Scans array of directories for .env files
- `scanEnvironment()`: Reads process.env for known key vars
- `scanConfig()`: Checks ~/.config subdirectories
- `parseEnvFile(path)`: Parses KEY=value format, matches against patterns
- `getChangedFiles(paths, since)`: Returns files modified after timestamp
- Pattern library: OpenAI, Anthropic, ElevenLabs, Cartesia, Replicate, Stability AI

**`src/setup/ConfigManager.js`** - Preference persistence
- `load()`: Reads config from file with priority merging
- `save(config)`: Writes to ~/.toastykey/config.json
- `migrate(oldVersion, newVersion)`: Handles config schema changes
- Priority: CLI flags > env vars > local .toastykey.json > ~/.toastykey/config.json > defaults

**`src/setup/ProjectWatcher.js`** - Filesystem monitoring
- `start(watchDirs)`: Initializes chokidar watcher
- `stop()`: Cleans up watchers
- `handleFileAdded(path)`: Processes new manifest files
- `identifyProject(manifestPath)`: Parses manifest, extracts name
- Manifest support: package.json, pyproject.toml, go.mod, Cargo.toml, composer.json, Gemfile, .csproj

### Modified Files

**`package.json`:**
- Add `bin` field: `{ "toastykey": "./bin/toastykey.js" }`
- Add dependencies: inquirer ^9.2.0, chalk ^4.1.2, ora ^5.4.1, chokidar ^3.5.3, open ^8.4.0, ignore ^5.3.0
- Update scripts: add `postinstall` to ensure bin is executable

**`src/index.js`:**
- Accept optional config parameter: `async function main(config = {})`
- Use config values for port, database path, banner display
- Skip banner if called from bin/toastykey.js (flag: config.skipBanner)

**`src/proxy/index.js` (ProxyServer constructor):**
- Accept ProjectWatcher instance as parameter
- Store reference: `this.projectWatcher = projectWatcher`
- Start watcher after server starts (if enabled): `await this.projectWatcher.start(config.watch.directories)`

**`src/db/schema.js`:**
- Add migration for projects table:
  - `type TEXT` (node, python, go, rust, php, ruby, dotnet)
  - `manifest_file TEXT` (package.json, pyproject.toml, etc.)
  - `auto_detected INTEGER DEFAULT 0` (1 if auto-detected, 0 if manual)
  - `detected_at TEXT` (ISO timestamp)

**`src/dashboard/src/App.jsx`:**
- Add WebSocket listener for `project_detected` event
- Show toast notification: "New project detected: {name}"
- Auto-refresh projects list

---

## 2. Setup Wizard Flow

### First Run Experience

**Step 1/4: Scan for API Keys**

Display:
```
Step 1/4: Scan for API Keys
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Scanning current directory...
✓ Found 3 API keys in .env
  • OpenAI (sk-proj-...xyz)
  • Anthropic (sk-ant-...xyz)
  • ElevenLabs (xi_...xyz)
```

Prompt:
```
? Scan additional locations?
❯ Yes, scan ~/.config and environment variables
  No, use only these 3 keys
  Let me choose specific directories
```

If "Let me choose":
```
? Select directories to scan: (Space to toggle, Enter to confirm)
❯ ◉ ~/.config
  ◉ ~/Projects
  ◯ ~/.aws
  ◯ Custom path...
```

Summary:
```
📋 Summary: 12 API keys found across 4 locations
? Import all keys? (Y/n)
```

**Step 2/4: Set Global Budget (Optional)**

Prompt:
```
Step 2/4: Set Global Budget (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
? Set a spending limit? (Press Enter to skip)
❯ Yes, set daily budget
  Yes, set monthly budget
  Skip for now
```

If daily selected:
```
? Daily budget limit: (500) ₹___
? Currency: (Use arrow keys)
❯ INR (₹)
  USD ($)

✓ Daily budget set: ₹500
```

**Step 3/4: Auto-Discover Projects (Optional)**

Prompt:
```
Step 3/4: Auto-Discover Projects (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
? Watch directories for new projects? (Press Enter to skip)
  [ ] ~/Projects
  [ ] ~/Documents
  [ ] ~/code
  [ ] Custom: ___________
```

Result:
```
✓ Watching ~/Projects for new projects
```

**Step 4/4: Launch**

Display:
```
Step 4/4: Launch
━━━━━━━━━━━━━━━━━━━━━━━━
✓ Setup complete!

Starting ToastyKey...
✓ Database ready
✓ Key vault initialized (12 keys)
✓ Pricing engine loaded
✓ Server running on http://localhost:4000

🎉 Opening dashboard...
```

### Subsequent Runs

Display:
```
┌─────────────────────────────────────────┐
│  🔥 ToastyKey                           │
└─────────────────────────────────────────┘

⚡ Quick check...
• Found 2 new .env files since last run
  ~/spazi/.env.local (1 key)
  ~/toasty-os/.env (1 key)

? Import these keys? (Y/n)

[If yes]
✓ Imported 2 keys

Starting ToastyKey...
✓ Server running on http://localhost:4000
✓ Dashboard at http://localhost:3000

💡 Run 'toastykey scan' to find more keys
💡 Run 'toastykey config' to change settings
```

### CLI Commands

```bash
npx toastykey              # Normal start (with quick check)
npx toastykey --no-scan    # Skip scan, start immediately
npx toastykey --port 5000  # Custom port
npx toastykey scan         # Manually trigger key scan
npx toastykey scan --all   # Full scan (ignore mtime cache)
npx toastykey config       # Re-run setup wizard
npx toastykey watch add ~/Projects  # Add watched directory
npx toastykey watch list   # Show watched directories
npx toastykey watch remove ~/Projects  # Remove watched directory
npx toastykey reset        # Clear config, run first-time setup
```

---

## 3. Key Scanner Implementation

### Supported Providers & Patterns

```javascript
const PROVIDER_PATTERNS = {
  openai: {
    pattern: /sk-proj-[A-Za-z0-9]{48,}|sk-[A-Za-z0-9]{48,}/,
    envVars: ['OPENAI_API_KEY', 'OPENAI_KEY'],
    configPaths: ['~/.config/openai/api_key', '~/.openai/api_key']
  },
  anthropic: {
    pattern: /sk-ant-api03-[A-Za-z0-9_-]{95,}/,
    envVars: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
    configPaths: ['~/.config/anthropic/api_key', '~/.anthropic/api_key']
  },
  elevenlabs: {
    pattern: /[a-f0-9]{32}/,
    envVars: ['ELEVENLABS_API_KEY', 'ELEVEN_API_KEY', 'XI_API_KEY'],
    configPaths: ['~/.config/elevenlabs/api_key']
  },
  // Add patterns for: Cartesia, Replicate, Stability AI, generic providers
};
```

### Scan Strategy

**File-based scanning (`scanPaths(paths)`):**
1. Walk directory tree (max depth 5)
2. Find files matching: `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.*`
3. Respect `.gitignore` using `ignore` library
4. Parse each file line-by-line
5. Match lines against `KEY_NAME=value` pattern
6. Validate value against provider patterns
7. Return: `{ provider, key, source, label, confidence }`

**Environment variable scanning (`scanEnvironment()`):**
1. Read `process.env`
2. Check each known env var name from PROVIDER_PATTERNS
3. If found, validate value against pattern
4. Mark source as: `environment`

**Config directory scanning (`scanConfig()`):**
1. For each provider in PROVIDER_PATTERNS
2. Check configPaths (expand ~ to home directory)
3. Read file if exists
4. Validate content against pattern
5. Mark source as config path

**Shell config scanning (opt-in, advanced):**
1. Only if user enables via `--scan-shell-config` flag
2. Read `~/.zshrc`, `~/.bashrc`, `~/.bash_profile`
3. Find lines matching: `export KEY_NAME=value` or `KEY_NAME=value`
4. Parse and validate
5. Warn: "Keys in shell config are visible to all processes"

### Security & Privacy

**Key Redaction:**
- Display format: `sk-proj-abc...xyz` (first 10 chars + "..." + last 3 chars)
- Never log full keys to console or files
- Config file stores only key IDs, not values

**Ignored Keys:**
- User can mark keys to never import
- Stored in config: `scan.ignored_keys = ["sk-proj-abc123..."]`
- Includes partial key for identification

**.gitignore Respect:**
- Use `ignore` library to parse .gitignore rules
- Never scan files matching .gitignore patterns
- Includes parent directory .gitignore files

**Scan History:**
- Track: `{ path, mtime, keys_found_count }`
- Stored in config: `scan.scan_history`
- Used for incremental scanning (only changed files)

### Incremental Scanning

**Quick check logic (`getChangedFiles(paths, since)`):**
```javascript
async getChangedFiles(paths, sinceTimestamp) {
  const changed = [];
  for (const scanPath of paths) {
    const files = await this.findEnvFiles(scanPath);
    for (const file of files) {
      const stats = await fs.stat(file);
      if (stats.mtime > sinceTimestamp) {
        changed.push(file);
      }
    }
  }
  return changed;
}
```

Only scans files modified after `last_scan_timestamp` from config.

### Deduplication

**Same key in multiple locations:**
- Import once from primary source (priority: .env > ~/.config > env vars)
- Display all sources in summary: "Found in 2 locations: .env (using), shell config"
- Store all sources in metadata for transparency

**Key matching:**
- Exact string match for full key
- Partial match (first 10 + last 3) for redacted keys in ignored list

---

## 4. Project Auto-Discovery

### Two-Mode Operation

**Mode 1: Passive (Always Active)**
- Uses existing `detectProject(db)` middleware in `src/proxy/middleware.js`
- When API call arrives with unknown path → auto-create project entry
- Zero overhead, no filesystem watching required
- Project name: `path.basename(projectPath)` or parsed from manifest if available

**Mode 2: Active (Opt-in)**
- Proactive filesystem watching using `chokidar`
- Watches specified directories for project manifest files
- Detects projects before they make API calls
- Higher resource usage, opt-in during setup or via CLI

### Project Manifest Detection

**Supported manifest files:**
```javascript
const PROJECT_MANIFESTS = {
  'package.json': {
    type: 'node',
    nameField: 'name',
    parser: (content) => JSON.parse(content).name
  },
  'pyproject.toml': {
    type: 'python',
    nameField: 'project.name',
    parser: (content) => parseToml(content).project?.name
  },
  'go.mod': {
    type: 'go',
    nameField: 'module',
    parser: (content) => content.match(/^module\s+(.+)$/m)?.[1]
  },
  'Cargo.toml': {
    type: 'rust',
    nameField: 'package.name',
    parser: (content) => parseToml(content).package?.name
  },
  'composer.json': {
    type: 'php',
    nameField: 'name',
    parser: (content) => JSON.parse(content).name
  },
  'Gemfile': {
    type: 'ruby',
    nameField: null, // Uses directory name
    parser: () => null
  },
  '*.csproj': {
    type: 'dotnet',
    nameField: 'PropertyGroup.AssemblyName',
    parser: (content) => parseXml(content).Project?.PropertyGroup?.AssemblyName
  }
};
```

### Project Identity

**Identification logic (`identifyProject(manifestPath)`):**
1. Determine manifest type from filename
2. Read and parse manifest file
3. Extract project name using parser function
4. Fallback to directory name if parser returns null
5. Normalize name: replace `@`, `/` with `-` (e.g., `@scope/package` → `scope-package`)
6. Return: `{ name, path, type, manifest_file }`

**Uniqueness:**
- Projects are unique by absolute path
- `/Users/bakatoast/Projects/spazi` ≠ `/Users/bakatoast/Documents/spazi`
- Symlinks resolved to real path before comparison
- Path normalized (trailing slash removed)

### Filesystem Watching

**Chokidar configuration:**
```javascript
const watcher = chokidar.watch(watchDirs, {
  ignored: /(^|[\/\\])\./, // Ignore dotfiles/dotdirs
  persistent: true,
  depth: 3, // Max 3 levels deep
  ignoreInitial: false, // Process existing files on start
  awaitWriteFinish: {
    stabilityThreshold: 500,
    pollInterval: 100
  }
});
```

**Event handling:**
- `add` event: New file created → check if manifest → identify project → create in DB
- `unlink` event: File deleted → if manifest, mark project as inactive (don't delete)
- `change` event: Ignored (project name doesn't change after creation)

**Debouncing:**
- Wait 500ms after file change before processing
- Prevents duplicate processing during rapid file writes
- Per-directory debounce timer (Map<path, timeout>)

### Dashboard Integration

**WebSocket events:**
- Event: `project_detected`
- Payload: `{ name, path, type, manifest_file, detected_at }`
- Dashboard listener in App.jsx shows toast notification
- Toast message: "New project detected: {name} ({type})"
- Toast action: "View Project" (navigates to /projects/{id})

**Database schema:**
```sql
ALTER TABLE projects ADD COLUMN type TEXT;
ALTER TABLE projects ADD COLUMN manifest_file TEXT;
ALTER TABLE projects ADD COLUMN auto_detected INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN detected_at TEXT;
```

### Performance Considerations

**Resource limits:**
- Maximum 5 watched directories (prevent resource exhaustion)
- Maximum depth 3 levels (prevent scanning node_modules, .venv, etc.)
- Debounce timer: 500ms (balance responsiveness vs. CPU usage)

**Graceful degradation:**
- If chokidar fails to initialize → disable active mode, use passive only
- If watch limit exceeded → disable active mode, show warning
- If permission denied → skip directory, log warning

**Exclusion patterns:**
- Automatically exclude: node_modules, .venv, venv, target, build, dist, .git
- User can add custom exclusions in config: `watch.exclude_patterns`

---

## 5. Configuration Management

### Config Schema

**Location:** `~/.toastykey/config.json`

**Structure:**
```json
{
  "version": "1.0.0",
  "first_run_complete": true,
  "first_run_timestamp": "2026-04-06T10:30:00Z",
  "scan": {
    "paths": ["/Users/bakatoast/Projects", "~/.config"],
    "last_scan_timestamp": "2026-04-06T10:30:00Z",
    "ignored_keys": ["sk-proj-abc123..."],
    "auto_scan_on_start": true,
    "scan_history": [
      { "path": "/Users/bakatoast/Projects/spazi/.env", "mtime": "2026-04-06T10:00:00Z", "keys_count": 2 }
    ]
  },
  "watch": {
    "enabled": true,
    "directories": ["/Users/bakatoast/Projects"],
    "max_depth": 3,
    "exclude_patterns": ["node_modules", ".venv", "venv", "target", "build"]
  },
  "preferences": {
    "currency": "INR",
    "auto_open_browser": true,
    "port": 4000,
    "skip_banner": false
  }
}
```

### Config Priority

**Merge order (highest to lowest):**
1. CLI flags: `npx toastykey --port 5000`
2. Environment variables: `TOASTYKEY_PORT=5000`
3. Local config: `./.toastykey.json` (project-specific overrides)
4. Global config: `~/.toastykey/config.json`
5. Hardcoded defaults

**Implementation:**
```javascript
async load() {
  const defaults = { /* ... */ };
  const globalConfig = await this.readFile('~/.toastykey/config.json');
  const localConfig = await this.readFile('./.toastykey.json');
  const envConfig = this.parseEnvVars();
  const cliConfig = this.parseCLIFlags();
  
  return deepMerge(defaults, globalConfig, localConfig, envConfig, cliConfig);
}
```

### Migration Strategy

**Version field:**
- Config includes `version` field (semver)
- On load, compare config version to current version
- If mismatch, run migration function

**Migration example (v1.0.0 → v1.1.0):**
```javascript
async migrate(config, fromVersion, toVersion) {
  if (fromVersion === '1.0.0' && toVersion === '1.1.0') {
    // Add new field with default
    config.watch.exclude_patterns = config.watch.exclude_patterns || ['node_modules'];
    config.version = '1.1.0';
    await this.save(config);
  }
}
```

---

## 6. Error Handling & Edge Cases

### Key Scanner Errors

**Permission denied:**
- Catch error, skip directory
- Log warning: "Couldn't scan ~/.config/anthropic (permission denied)"
- Continue with other directories
- Show in summary: "Scanned 3 of 4 locations (1 permission error)"

**Malformed .env file:**
- Skip invalid lines, parse valid ones
- Log warning with line number: "Skipped invalid line 15 in .env"
- Continue processing rest of file

**Invalid key pattern:**
- Skip key that doesn't match pattern
- Example: `OPENAI_API_KEY=placeholder` → doesn't match regex, ignored
- Log debug message (not visible to user unless --verbose)

**Duplicate keys:**
- Import once from highest priority source
- Log: "Key sk-proj-abc...xyz found in 2 locations, using .env"

### Project Watcher Errors

**Watch limit exceeded:**
- OS limit (typically 8192 watchers on Linux)
- Catch error from chokidar.watch()
- Disable active watching, fall back to passive mode
- Show error: "Couldn't watch directories (system limit reached). Using passive detection only."
- Suggest: "Reduce watched directories or increase system limit"

**Malformed manifest:**
- Catch parse error (JSON.parse, TOML parse, etc.)
- Skip project, log warning
- Retry on next file change (maybe file was mid-write)

**Chokidar initialization fails:**
- Catch error in ProjectWatcher.start()
- Set watcher to null, disable active mode
- Log error, continue with passive mode
- Dashboard shows: "Filesystem watching unavailable"

### Setup Wizard Errors

**Config file write fails:**
- Catch error in ConfigManager.save()
- Store config in memory for current session
- Warn user: "Couldn't save config to ~/.toastykey/ (permission denied)"
- Suggest alternative: "Run with sudo or specify custom path: --config ./config.json"

**Database initialization fails:**
- Catch error in Database constructor
- Show clear error with suggestions:
  - "Check file permissions on ./toastykey.db"
  - "Check disk space"
  - "Ensure sqlite3 is installed"
- Offer fallback: "Start with in-memory database? (non-persistent)"

**Port already in use:**
- Catch EADDRINUSE error
- Auto-increment port: 4000 → 4001 → 4002 (max 5 attempts)
- Show: "Port 4000 in use, starting on 4001"
- Save chosen port in config for next run

**Network error (can't open browser):**
- Catch error from `open()` library
- Log warning: "Couldn't open browser automatically"
- Show URL: "Dashboard available at http://localhost:3000"

---

## 7. Testing Strategy

### Unit Tests

**KeyScanner (`tests/unit/setup/key-scanner.test.js`):**
- Test pattern matching for each provider
- Test .env file parsing (valid lines, invalid lines, comments)
- Test .gitignore respect (use mock filesystem)
- Test deduplication logic
- Test redaction display format
- Mock filesystem with memfs library

**ProjectWatcher (`tests/unit/setup/project-watcher.test.js`):**
- Mock chokidar events (add, unlink)
- Test manifest parsing (package.json, pyproject.toml, etc.)
- Test debouncing (multiple rapid events → single processing)
- Test path normalization
- Test exclusion patterns

**ConfigManager (`tests/unit/setup/config-manager.test.js`):**
- Test config priority (CLI > env > file > defaults)
- Test deep merge logic
- Test migration (v1.0.0 → v1.1.0)
- Test validation (reject invalid config values)

**SetupManager (`tests/unit/setup/setup-manager.test.js`):**
- Mock inquirer prompts with predefined answers
- Test wizard flow (4 steps)
- Test skip behavior (Enter on optional steps)
- Test quick check logic (detect new files)

### Integration Tests

**First run flow (`tests/integration/first-run.test.js`):**
- Create temp directory structure with test .env files
- Run bin/toastykey.js programmatically (mocked inquirer inputs)
- Verify config file created at expected path
- Verify keys imported to database
- Verify server starts on expected port

**Subsequent run flow (`tests/integration/subsequent-run.test.js`):**
- Start with existing config
- Add new .env file to watched directory
- Run bin/toastykey.js
- Verify quick scan detects new file
- Verify prompt to import new keys

**Project auto-discovery (`tests/integration/project-discovery.test.js`):**
- Create temp directory
- Initialize ProjectWatcher with temp dir
- Add package.json file
- Wait for chokidar event processing
- Verify project created in database with correct name/type

### Manual Testing Checklist

- [ ] First run on clean system (no ~/.toastykey/)
- [ ] Scan with .env in current directory
- [ ] Scan with keys in ~/.config
- [ ] Scan with keys in environment variables
- [ ] Test with real API keys (OpenAI, Anthropic)
- [ ] Enable project watching during setup
- [ ] Create new project in watched directory, verify auto-detection
- [ ] Dashboard notification appears for new project
- [ ] Subsequent run with no changes (quick start)
- [ ] Subsequent run with new .env file (quick scan + import)
- [ ] Test CLI commands: scan, config, watch, reset
- [ ] Test --no-scan flag
- [ ] Test --port flag
- [ ] Test on macOS, Linux, Windows (if possible)

---

## 8. Implementation Phases

### Phase 1: Core Infrastructure (Foundation)
- Create bin/toastykey.js entry point
- Implement ConfigManager (load, save, merge)
- Update package.json (bin, dependencies)
- Basic CLI flag parsing

### Phase 2: Key Scanner (First Value)
- Implement KeyScanner class
- Pattern library for all providers
- File-based scanning (.env variants)
- Environment variable scanning
- Redaction and deduplication

### Phase 3: Setup Wizard (User Experience)
- Implement SetupManager
- 4-step wizard with inquirer
- Progress indicators with ora
- Color output with chalk
- Browser launch with open

### Phase 4: Project Discovery (Auto-magic)
- Implement ProjectWatcher
- Chokidar integration
- Manifest parsing (all formats)
- Database schema migration
- WebSocket integration

### Phase 5: Polish & Testing
- Quick check logic (incremental scanning)
- CLI commands (scan, config, watch, reset)
- Error handling and edge cases
- Unit tests for all components
- Integration tests
- Documentation

---

## Success Criteria

**User Experience:**
- First run completes in 30-60 seconds with full setup
- Subsequent runs start in 2-3 seconds
- Zero manual configuration for basic use case
- Clear, actionable error messages

**Functionality:**
- Detects API keys in 90%+ of common locations
- Auto-discovers projects within 1 second of manifest creation (active mode)
- Handles 100+ projects without performance degradation
- Respects user privacy (.gitignore, redaction, local-only scanning)

**Code Quality:**
- 80%+ unit test coverage for new code
- Integration tests cover happy path + common errors
- Clean separation of concerns (Scanner, Watcher, Manager)
- Backward compatible with existing ToastyKey installations

**Performance:**
- Key scan completes in <5 seconds for typical project
- Incremental scan (subsequent runs) completes in <1 second
- Filesystem watching uses <50MB memory for 5 watched directories
- No noticeable impact on server startup time (<500ms added)
