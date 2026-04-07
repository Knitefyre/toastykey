# Changelog

All notable changes to ToastyKey will be documented in this file.

## [0.4.0] - 2026-04-06

### Added - Session 4A: Smart Setup & Discovery

- **One-command install**: `npx toastykey` now runs setup wizard on first use
- **Smart API key detection**:
  - Scans .env files recursively (respects .gitignore)
  - Checks ~/.config and environment variables
  - Supports OpenAI, Anthropic, ElevenLabs, Cartesia, Replicate, Stability AI
  - Key redaction for security (shows first 10 + last 3 chars)
- **Auto-project discovery**:
  - Watches directories for new projects
  - Parses manifests: package.json, pyproject.toml, go.mod, Cargo.toml, composer.json, Gemfile
  - WebSocket notifications in dashboard
- **Quick check on subsequent runs**: Detects new .env files since last run
- **CLI commands**: scan, config, watch list/add/remove, reset
- **Configuration management**: ~/.toastykey/config.json with priority merging
- **4-step setup wizard**:
  - Step 1: Scan for API keys
  - Step 2: Set budget (optional)
  - Step 3: Auto-discover projects (optional)
  - Step 4: Launch server and dashboard

### Technical

- New modules: ConfigManager, KeyScanner, SetupManager, ProjectWatcher
- Entry point: bin/toastykey.js
- Dependencies: inquirer, chalk, ora, chokidar, open, ignore
- Database migration: Added type, manifest_file, auto_detected, detected_at columns to projects table
- Test coverage: 27 passing tests for setup module

## [0.3.0-session3a] - 2026-04-05

### Added - Session 3: Backend Components

- Anomaly detection system with baseline tracking
- Trigger system for cost/rate/error anomalies
- Report generation engine with Handlebars templates
- Additional provider handlers: ElevenLabs, Cartesia, Replicate, Stability AI, Generic
- Budget enforcement with 100% blocking
- MCP tools expanded to 13 tools

## [0.2.0] - Earlier

- Dashboard UI with React
- Multi-provider support
- Key vault with encryption
- Basic cost tracking

## [0.1.0] - Initial Release

- API proxy functionality
- SQLite storage
- OpenAI and Anthropic support
