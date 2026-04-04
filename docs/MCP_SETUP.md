# ToastyKey MCP Setup for Claude Code

This guide helps you connect ToastyKey to Claude Code via the Model Context Protocol (MCP).

## Quick Setup

1. **Locate your Claude Code MCP config file:**

   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Add ToastyKey to the config:**

   Open the config file and add this to the `mcpServers` section:

   ```json
   {
     "mcpServers": {
       "toastykey": {
         "command": "node",
         "args": [
           "/Users/bakatoast/Toasty OS/toastykey/src/index.js",
           "mcp"
         ]
       }
     }
   }
   ```

   **Important:** Replace the path with your actual ToastyKey installation path.

3. **Restart Claude Code**

4. **Test the connection:**

   In Claude Code, try asking:
   - "How much have I spent today?"
   - "What API keys do I have?"
   - "Set my daily budget to 500 rupees"

## Available Tools

Once connected, Claude Code can use these ToastyKey tools:

- `get_spend_summary` - Get spending for today/week/month
- `get_project_cost` - Get cost for a specific project
- `get_session_cost` - Get cost for current coding session
- `set_budget` - Create budget caps
- `get_budget_status` - Check budget status
- `list_keys` - List stored API keys
- `add_key` - Add new API key to vault

## Example Usage

```
User: "How much have I spent on APIs this week?"
Claude: [calls get_spend_summary with period="week"]

User: "Add my OpenAI key to the vault"
Claude: "Sure, I can help you add that. What's your OpenAI API key?"
User: "sk-proj-abc123..."
Claude: [calls add_key with provider="openai", label="default"]

User: "Set a daily budget of 500 rupees"
Claude: [calls set_budget with scope="global", period="day", limit=500]
```

## Troubleshooting

**MCP server not showing up in Claude Code:**
- Check that the path in the config is correct
- Make sure Node.js is installed and in your PATH
- Restart Claude Code completely

**Tools not working:**
- Make sure ToastyKey dependencies are installed: `npm install`
- Check that the database file can be created/accessed
- Look for errors in Claude Code's developer console

**Database locked errors:**
- Only run one instance of ToastyKey at a time
- Don't run `npm start` and MCP mode simultaneously

## Development Mode

To test MCP locally without Claude Code:

```bash
# Run MCP server in stdio mode
npm run mcp

# Send MCP request (for testing)
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npm run mcp
```
