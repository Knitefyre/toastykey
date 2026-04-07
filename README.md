# ToastyKey

**Track. Control. Understand.**

The API cost layer for AI-native builders.

---

## What is ToastyKey?

ToastyKey is a local MCP server + API proxy that gives you complete visibility and control over your AI API costs. It runs on your machine, intercepts your API calls, logs every dollar spent, and connects directly to Claude Code.

**One-liner:** The layer between your AI code and your real-world cost.

## Installation

### One-Command Install (Session 4A)

```bash
npx toastykey
```

On first run, ToastyKey will:
1. Scan for API keys in your current directory
2. Optionally scan additional locations (~/.config, environment variables)
3. Set up a global budget (optional)
4. Configure project auto-discovery (optional)
5. Start the server and open the dashboard

### Subsequent Runs

```bash
npx toastykey
```

ToastyKey checks for new API keys and starts immediately (2-3 seconds).

### CLI Commands

```bash
npx toastykey                    # Start server (with quick check)
npx toastykey --no-scan          # Skip scan, start immediately
npx toastykey --port 5000        # Use custom port

npx toastykey scan               # Manually scan for new keys
npx toastykey config             # Re-run setup wizard
npx toastykey watch list         # Show watched directories
npx toastykey watch add ~/code   # Watch directory for new projects
npx toastykey reset              # Reset configuration
```

### Configuration

Config stored in `~/.toastykey/config.json`

Override with:
- CLI flags: `--port 5000`
- Environment variables: `TOASTYKEY_PORT=5000`
- Local config: `./.toastykey.json`

### Manual Setup

```bash
git clone <repository-url>
cd toastykey
npm install
npm start
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
