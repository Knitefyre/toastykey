<div align="center">

```
  ████████╗ ██████╗  █████╗ ███████╗████████╗██╗   ██╗██╗  ██╗███████╗██╗   ██╗
  ╚══██╔══╝██╔═══██╗██╔══██╗██╔════╝╚══██╔══╝╚██╗ ██╔╝██║ ██╔╝██╔════╝╚██╗ ██╔╝
     ██║   ██║   ██║███████║███████╗   ██║    ╚████╔╝ █████╔╝ █████╗   ╚████╔╝
     ██║   ██║   ██║██╔══██║╚════██║   ██║     ╚██╔╝  ██╔═██╗ ██╔══╝    ╚██╔╝
     ██║   ╚██████╔╝██║  ██║███████║   ██║      ██║   ██║  ██╗███████╗   ██║
     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝╚══════╝   ╚═╝
```

**Track. Control. Understand. The API cost layer for AI-native builders.**

[![npm version](https://img.shields.io/npm/v/toastykey?color=22c55e&label=npm)](https://www.npmjs.com/package/toastykey)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-148%20passing-22c55e)](https://github.com/Knitefyre/toastykey)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-22c55e.svg)](https://github.com/Knitefyre/toastykey/blob/main/CONTRIBUTING.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-22c55e)](https://nodejs.org)

</div>

---

## The Problem

Your AI agents burn through API credits silently. You find out when the bill arrives — or when a runaway loop costs you $200 in an afternoon. **ToastyKey sits between your code and every AI provider**, logging every call, calculating every cent, and letting you set hard stops before the damage is done.

---

## Quick Start

```bash
# Install globally
npm install -g toastykey

# Load demo data and launch
toastykey --demo
cp toastykey-demo.db toastykey.db
toastykey

# Open dashboard
open http://localhost:3000
```

Or try without installing:

```bash
npx toastykey
```

---

## Dashboard Preview

> Real-time API cost monitoring across all your AI providers — local, private, zero telemetry.

| Overview | Projects | Anomaly Detection |
|----------|----------|-------------------|
| Live spend, charts, provider breakdown | Per-project cost attribution | Rate spikes, cost spikes, error storms |
| `localhost:3000` | Auto-detected from API calls | Auto-pause before you overspend |

*Screenshots: [docs/screenshots/](docs/screenshots/)*

---

## What You Get

### Real-Time Cost Tracking
Stop guessing what your AI agents cost. Every API call to every provider is intercepted, logged, and priced in real-time. See your spend for today, this week, this month — broken down by provider, project, and model.

### Beautiful Dark Dashboard
An Apple-aesthetic React dashboard that actually looks good. Spend trend charts, provider breakdown bars, "What You Got" tangible output counters (images generated, LLM calls, audio minutes, transcriptions). Monitor [Claude Code costs](https://claude.ai/claude-code), [OpenAI spending](https://platform.openai.com), and all your other AI APIs in one place.

### Budget Alerts That Actually Stop Things
Set a daily or monthly budget. When you hit 80%, get a warning. At 100%, ToastyKey auto-pauses the responsible provider or kills all API calls outright. No more discovering overspending after the fact.

### Anomaly Detection
Six trigger types that watch for unusual patterns:
- **Rate Spike** — sudden surge in calls per minute
- **Cost Spike** — spending accelerating faster than normal
- **Error Storm** — >50% of calls failing at once
- **Token Explosion** — a single call using 10× your average tokens
- **Silent Drain** — API calls happening when nothing should be running
- **New Provider** — your code suddenly calling a provider you've never used

Each trigger can log, notify, webhook, auto-pause, or auto-kill.

### Encrypted Local Key Vault
Store all your API keys in one place, encrypted with AES-256-GCM. Auto-detect keys from `.env` files across your filesystem. Keys never leave your machine.

### MCP Integration — Claude Code Sees Its Own Costs
```
"How much have I spent today?" → ₹2,847
"Set my daily budget to ₹5,000" → Done
"Which project is costing the most?" → toastykey-dev: ₹738
```

ToastyKey exposes **13 MCP tools** directly to Claude Code. Your AI assistant can query its own API costs, set budgets, and get optimization recommendations — all without leaving the conversation.

### Zero Config, Local-First
Everything stored in SQLite on your machine. No cloud account, no API key for ToastyKey itself, no telemetry, no data ever sent anywhere. Works offline.

---

## Supported Providers

| Provider | Status | Proxy Route | Tracked Metrics |
|----------|--------|-------------|-----------------|
| **OpenAI** | ✅ Native | `/openai/*` | Tokens, cost, model, images, audio |
| **Anthropic** | ✅ Native | `/anthropic/*` | Input/output tokens, cost, model |
| **ElevenLabs** | ✅ Native | `/elevenlabs/*` | Characters, audio minutes, voice |
| **Cartesia** | ✅ Native | `/cartesia/*` | Audio duration, model |
| **Replicate** | ✅ Native | `/replicate/*` | Predictions, compute time |
| **Stability AI** | ✅ Native | `/stability/*` | Images, steps, credits |
| **Any REST API** | ✅ Generic | `/custom/:name/*` | Request count, latency |

---

## How It Works

```
Your Code
    │
    ▼
ToastyKey Proxy (localhost:4000)
    │  ┌─────────────────────────────────────┐
    │  │  1. Intercept request               │
    │  │  2. Check budget (block if exceeded)│
    │  │  3. Forward to real API             │
    │  │  4. Parse response, calculate cost  │
    │  │  5. Log to SQLite                   │
    │  │  6. Check anomaly triggers          │
    │  └─────────────────────────────────────┘
    │
    ▼
Real API Provider (OpenAI, Anthropic, etc.)
    │
    ▼
Your Code gets the response (unchanged)
```

**Change one line in your code:**

```diff
# Before (OpenAI example)
- OPENAI_BASE_URL=https://api.openai.com/v1

# After — all calls now tracked
+ OPENAI_BASE_URL=http://localhost:4000/openai/v1
```

That's it. No SDK changes, no code refactoring. The proxy is transparent.

---

## MCP Integration (Claude Code)

Add to your Claude Code `settings.json`:

```json
{
  "mcpServers": {
    "toastykey": {
      "command": "node",
      "args": ["/path/to/toastykey/src/index.js", "mcp"]
    }
  }
}
```

Or use the Settings page in the dashboard — it generates the config snippet automatically.

### 13 Available MCP Tools

| Tool | What It Does |
|------|-------------|
| `get_spend_summary` | Today/week/month spend with provider breakdown |
| `get_project_cost` | Cost for a specific project directory |
| `get_session_cost` | Cost for the current Claude Code session |
| `set_budget` | Create/update a budget (global, project, or session) |
| `get_budget_status` | Check remaining budget and alert status |
| `list_keys` | List all stored API keys (no values exposed) |
| `add_key` | Store a new API key in the encrypted vault |
| `get_anomaly_log` | Recent anomaly detection events |
| `get_provider_stats` | Per-provider breakdown with costs and call counts |
| `get_cost_breakdown` | Detailed cost breakdown by model and time period |
| `pause_provider` | Pause all calls to a specific provider |
| `resume_provider` | Resume a paused provider |
| `get_recommendations` | AI-powered cost optimization suggestions |

---

## CLI Reference

```bash
toastykey                    # Start (with quick .env scan)
toastykey --no-scan          # Start immediately, skip scan
toastykey --demo             # Generate demo database
toastykey --port 5000        # Use custom port

toastykey scan               # Manually scan for new API keys
toastykey config             # Re-run setup wizard
toastykey watch list         # Show watched directories
toastykey watch add ~/code   # Watch directory for new projects
toastykey reset              # Reset all configuration
```

---

## vs. Alternatives

| Feature | **ToastyKey** | Helicone | Portkey | LiteLLM |
|---------|:---:|:---:|:---:|:---:|
| Local-first | ✅ | ❌ Cloud | ❌ Cloud | ✅ |
| Free forever | ✅ | Freemium | Freemium | ✅ |
| MCP native | ✅ | ❌ | ❌ | ❌ |
| Visual dashboard | ✅ | ✅ | ✅ | ❌ CLI |
| Anomaly detection | ✅ | ❌ | ❌ | ❌ |
| Encrypted key vault | ✅ | ❌ | ❌ | ❌ |
| Budget auto-pause | ✅ | ❌ | Partial | Partial |
| Any REST provider | ✅ Generic | Limited | Limited | ✅ |
| Zero telemetry | ✅ | ❌ | ❌ | ✅ |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ToastyKey                             │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   Proxy      │    │  Dashboard   │    │  MCP      │ │
│  │  :4000       │    │  :3000       │    │  Server   │ │
│  │              │    │  React + Vite│    │           │ │
│  │  /openai     │    │              │    │  13 tools │ │
│  │  /anthropic  │    │  Overview    │    │           │ │
│  │  /elevenlabs │    │  Projects    │    │  Claude   │ │
│  │  /cartesia   │    │  Key Vault   │    │  Code     │ │
│  │  /replicate  │    │  Triggers    │    │  ↔        │ │
│  │  /stability  │    │  Reports     │    │  ToastyKey│ │
│  │  /custom     │    │  Settings    │    │           │ │
│  └──────┬───────┘    └──────┬───────┘    └───────────┘ │
│         │                   │                           │
│         └─────────┬─────────┘                           │
│                   ▼                                     │
│           ┌───────────────┐                             │
│           │   SQLite DB   │                             │
│           │  (local only) │                             │
│           │               │                             │
│           │  api_calls    │                             │
│           │  projects     │                             │
│           │  sessions     │                             │
│           │  budgets      │                             │
│           │  triggers     │                             │
│           │  api_keys     │                             │
│           └───────────────┘                             │
└─────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Backend:** Node.js + Express, SQLite (better-sqlite3), Socket.io
- **Dashboard:** React 18, Vite, Tailwind CSS, Recharts, Lucide
- **MCP:** @modelcontextprotocol/sdk
- **Security:** AES-256-GCM key encryption (Node.js crypto)
- **Pricing:** Custom engine with model-level pricing for all providers

---

## Installation Options

### Global CLI (Recommended)
```bash
npm install -g toastykey
toastykey
```

### From Source
```bash
git clone https://github.com/Knitefyre/toastykey.git
cd toastykey
npm install
npm run dashboard:install
npm run dashboard:build
npm start
```

### Dev Mode (hot reload)
```bash
npm run dashboard:install
npm run dev   # Starts both proxy (4000) and Vite dashboard (3000)
```

---

## Configuration

Config stored at `~/.toastykey/config.json`. Override with:

```bash
TOASTYKEY_PORT=5000 toastykey          # env var
toastykey --port 5000                  # CLI flag
echo '{"port":5000}' > .toastykey.json # local file
```

---

## Development

```bash
# Run all 148 tests
npm test

# Run tests with coverage
npm test -- --coverage

# Inspect the database
sqlite3 toastykey.db ".tables"
sqlite3 toastykey.db "SELECT * FROM api_calls LIMIT 5"

# Run just the MCP server (for Claude Code integration)
npm run mcp
```

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

**Quick contribution guide:**
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes + add tests
4. Run `npm test` — all tests must pass
5. Submit a PR against `main`

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.

---

## Security

API keys stored in the vault are encrypted with AES-256-GCM before being written to disk. The encryption key is derived from your machine's unique identifier and never stored in plaintext.

Found a security issue? Please report it privately — see [SECURITY.md](SECURITY.md).

---

## License

MIT License — [Toasty Media Pvt. Ltd.](https://toastymedia.in)

See [LICENSE](LICENSE) for full text.

---

<div align="center">

**[Dashboard](http://localhost:3000)** · **[GitHub](https://github.com/Knitefyre/toastykey)** · **[npm](https://npmjs.com/package/toastykey)** · **[Issues](https://github.com/Knitefyre/toastykey/issues)**

*Built with 🔥 by [Toasty Media](https://toastymedia.in)*

**Track. Control. Understand.**

</div>
