# ToastyKey

**Track. Control. Understand.**

The API cost layer for AI-native builders.

---

## What is ToastyKey?

ToastyKey is a local MCP server + API proxy that gives you complete visibility and control over your AI API costs. It runs on your machine, intercepts your API calls, logs every dollar spent, and connects directly to Claude Code.

**One-liner:** The layer between your AI code and your real-world cost.

## Installation

```bash
git clone <repository-url>
cd toastykey
npm install
```

## Quick Start

```bash
# 1. Start ToastyKey
npm start

# 2. Add your API keys
node tests/manual-openai-test.js setup

# 3. Point your code to the proxy
# Change: https://api.openai.com/v1/chat/completions
# To:     http://localhost:4000/openai/v1/chat/completions

# 4. Check your spending
curl http://localhost:4000/stats
```

## Features (Session 1)

✅ **API Proxy** - Intercept and log all API calls
✅ **Cost Tracking** - Real-time cost calculation in USD and INR
✅ **Key Vault** - Encrypted storage for all API keys (AES-256-GCM)
✅ **MCP Integration** - Connect to Claude Code via MCP
✅ **Multi-Provider** - OpenAI and Anthropic support
✅ **SQLite Storage** - All data stored locally, never leaves your machine
✅ **Budget Caps** - Set spending limits (basic enforcement)
✅ **Project Tracking** - Automatic cost attribution per project

## Supported Providers

- **OpenAI** - GPT-4o, GPT-4o-mini, DALL-E, Whisper, TTS
- **Anthropic** - Claude Opus, Sonnet, Haiku

More providers coming in Session 3 (ElevenLabs, Cartesia, Replicate, Stability).

## Usage

### Proxy Mode (Default)

```bash
npm start
```

Routes:
- `http://localhost:4000/openai/*` → forwards to `api.openai.com`
- `http://localhost:4000/anthropic/*` → forwards to `api.anthropic.com`
- `http://localhost:4000/stats` → your spending stats
- `http://localhost:4000/vault/add` → add API keys

### MCP Mode (for Claude Code)

```bash
npm run mcp
```

Connect to Claude Code by adding to your MCP config:

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

Then in Claude Code:
- "How much have I spent today?"
- "Set my daily budget to 500 rupees"
- "What API keys do I have?"

See [docs/MCP_SETUP.md](docs/MCP_SETUP.md) for details.

## Architecture

```
Your Code → ToastyKey Proxy → Logs to SQLite + Calculates Cost → Real API → Returns Response
                   ↓
              Key Vault (encrypted)
              Pricing Engine
              Budget Checker
```

## Documentation

- [MCP Setup Guide](docs/MCP_SETUP.md)
- [Session 1 Complete](docs/SESSION1_COMPLETE.md)
- [Master Specification](docs/toastykey_masterdoc.pdf)

## Development

```bash
# Run tests
npm test

# Run integration tests
./tests/run-integration.sh

# Inspect database
sqlite3 toastykey.db
```

## Project Status

**Session 1: COMPLETE ✓**
- Core infrastructure
- Proxy server
- Database
- Key vault
- MCP server

**Session 2: PLANNED**
- React dashboard
- Real-time WebSocket updates
- Visual budget management

**Session 3: PLANNED**
- Anomaly detection
- Trigger system
- Additional providers
- npm package

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Built with:
- Express.js
- sqlite3
- @modelcontextprotocol/sdk
- axios

---

**ToastyKey v0.1.0** - A Toasty Media Project

Track. Control. Understand.
