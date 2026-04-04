# ToastyKey

**Track. Control. Understand.**

The API cost layer for AI-native builders.

## Installation

```bash
npm install
npm start
```

## Usage

ToastyKey runs on:
- Proxy: localhost:4000
- Dashboard: localhost:3000 (Session 2)
- MCP: stdio connection

See docs/toastykey_masterdoc.pdf for full documentation.

## MCP Integration with Claude Code

ToastyKey can connect to Claude Code via the Model Context Protocol.

**Quick setup:**

1. Add to your Claude Code MCP config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "toastykey": {
      "command": "node",
      "args": ["<path-to-toastykey>/src/index.js", "mcp"]
    }
  }
}
```

2. Restart Claude Code

3. Ask Claude: "How much have I spent today?"

See [docs/MCP_SETUP.md](docs/MCP_SETUP.md) for detailed instructions.
