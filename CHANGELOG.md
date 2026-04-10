# Changelog

All notable changes to ToastyKey are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-04-10

Production release. 148 tests passing.

### Added — Dashboard & UI

- **Overview page** — Real-time stat cards: today's spend, monthly spend, API call count, active projects
- **Spend Trend chart** — 30-day sparkline with interactive tooltip (Recharts)
- **Provider Breakdown** — Live horizontal bar chart across all connected providers
- **Tangible Outputs** — "What You Got" counters: images generated, LLM calls, audio minutes, transcriptions
- **Activity Feed** — Recent API calls with provider, model, cost, latency, and status badge
- **Projects view** — Auto-detected project cards with per-project cost, call count, last-active time
- **Project Detail** — Per-project: total cost, call count, sessions, provider breakdown, recent activity
- **Key Vault** — AES-256-GCM encrypted API key storage; auto-detect `.env` files from filesystem; import from pasted `.env` content
- **Anomaly Detection (Triggers)** — Six trigger types (rate spike, cost spike, error storm, token explosion, silent drain, new provider); six action types (log, dashboard notify, Claude Code alert, auto-pause, auto-kill, webhook); Global / Provider / Project scopes; event log with metric vs baseline values
- **Reports** — Generate daily / weekly / monthly / custom range reports; provider breakdown, trend comparison, top expensive calls, anomaly events, model recommendations; HTML + JSON output saved to disk
- **Settings** — Currency toggle (INR/USD), auto-scan toggle, auto-reports toggle; data management card (record count, clear data with date range, add demo data with "rewrite" confirmation); MCP config snippet with copy button
- **Command Palette** — ⌘K / Ctrl+K global search across all pages and actions
- **Toast notification system** — Success, error, warning, info toasts with auto-dismiss and manual close
- **Glass morphism design system** — Dark aesthetic (#09090B base), Inter + JetBrains Mono, emerald accent, consistent Tailwind utility tokens
- **Real-time WebSocket updates** — Live stats refresh without page reload via Socket.io

### Added — Backend & Proxy

- **7 provider handlers:** OpenAI (GPT-4o, DALL-E, Whisper, TTS), Anthropic (Claude all models), ElevenLabs (TTS, voices), Cartesia (TTS), Replicate (predictions), Stability AI (images), Generic (any REST API)
- **Budget enforcement** — Hard blocks at 100% with 80% warning; per-scope (global/project/session) and per-period (daily/weekly/monthly)
- **Budget override** — Temporary limit increase with expiration for emergency access
- **Anomaly detection engine** — Baseline tracking with rolling windows; triggers fire on threshold breach; events logged to `trigger_events` table
- **Report generation** — Handlebars-templated HTML reports; JSON summary with recommendations; saved to `reports/` directory
- **Data management API** — `/api/data/stats`, `/api/data/clear`, `/api/data/demo` endpoints
- **Vault scan API** — `/api/vault/scan-env` scans filesystem for `.env` files containing known provider keys
- **Null-safe report generator** — All Handlebars helpers guard against null values from empty date ranges

### Added — MCP (13 tools)

`get_spend_summary`, `get_project_cost`, `get_session_cost`, `set_budget`, `get_budget_status`, `list_keys`, `add_key`, `get_anomaly_log`, `get_provider_stats`, `get_cost_breakdown`, `pause_provider`, `resume_provider`, `get_recommendations`

### Fixed

- `SQLITE_ERROR: no such column: active` in report generator budget query
- AddTriggerModal inputs using non-existent design token class names
- Reports page `toFixed` crash on null cost values from empty date ranges
- Overview stats mapping wrong API response field names (zeros shown everywhere)
- ProjectDetail provider breakdown normalizer not handling `cost_inr` field name variant
- Toast manual-close no-op (was passing empty callback instead of `removeToast`)
- ErrorBoundary direct state mutation not triggering re-render

---

## [0.4.0] — 2026-04-06

### Added — Session 4A: Smart Setup & Discovery

- One-command install: `npx toastykey` runs setup wizard on first use
- Smart API key detection — scans `.env` files recursively (respects `.gitignore`), checks `~/.config` and environment variables
- Supports OpenAI, Anthropic, ElevenLabs, Cartesia, Replicate, Stability AI key patterns
- Auto-project discovery — watches directories, parses `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `composer.json`, `Gemfile`
- WebSocket notifications for new project detection
- Quick check on subsequent runs — detects new `.env` files since last scan
- CLI commands: `scan`, `config`, `watch list/add/remove`, `reset`
- Configuration management: `~/.toastykey/config.json` with priority merging (env var → CLI flag → local file → global config)
- 4-step setup wizard: scan keys → set budget → discover projects → launch

### Technical

- New modules: `ConfigManager`, `KeyScanner`, `SetupManager`, `ProjectWatcher`
- Entry point: `bin/toastykey.js`
- Dependencies: `inquirer`, `chalk`, `ora`, `chokidar`, `open`, `ignore`
- 27 new passing tests for setup module

---

## [0.3.0-session3a] — 2026-04-05

### Added — Session 3: Anomaly Detection & More Providers

- Anomaly detection system with rolling baseline tracking
- Trigger system: 6 trigger types, 6 action types, per-scope configuration
- Report generation engine with Handlebars templates (HTML + JSON)
- Additional provider handlers: ElevenLabs, Cartesia, Replicate, Stability AI, Generic
- Budget enforcement with hard 100% blocking
- MCP tools expanded from 7 to 13

---

## [0.2.0] — 2026-04-03

### Added — Session 2: React Dashboard

- React 18 + Vite dashboard on port 3000
- Multi-provider support (OpenAI + Anthropic native)
- Encrypted key vault (AES-256-GCM)
- Basic cost tracking and display
- SQLite schema for api_calls, projects, sessions, budgets, api_keys
- Vite proxy forwarding `/api` to Express backend

---

## [0.1.0] — 2026-04-01

### Added — Initial Release

- Express.js proxy server on port 4000
- OpenAI and Anthropic request interception
- SQLite storage for API call logs
- Basic cost calculation (USD + INR)
- `@modelcontextprotocol/sdk` MCP server skeleton
