# ToastyKey Session 1 - Complete ✓

## What Was Built

Session 1 delivered the complete core infrastructure for ToastyKey:

### 1. Project Setup ✓
- Node.js project initialized with all dependencies
- Folder structure created for all components
- Configuration system with sensible defaults

### 2. Database Layer ✓
- Full SQLite schema (8 tables)
- CRUD helpers for all entities
- Aggregation queries for cost tracking
- Indexes for performance

### 3. Pricing Engine ✓
- JSON-based pricing data for OpenAI and Anthropic
- Cost calculator supporting multiple pricing units
- USD and INR currency support
- Extensible for additional providers

### 4. Key Vault ✓
- AES-256-GCM encryption
- Machine-specific key derivation
- Secure storage in SQLite
- Never logs or exposes keys

### 5. Proxy Server ✓
- Express-based HTTP proxy
- Routes for OpenAI (`/openai/*`)
- Routes for Anthropic (`/anthropic/*`)
- Request/response logging
- Cost calculation per request
- Project detection
- Budget checking middleware

### 6. MCP Server ✓
- Full MCP protocol implementation
- 7 core tools for Claude Code
- Stdio transport
- Proper error handling

## Testing Status

✓ All unit tests passing
✓ Integration tests passing
✓ Manual testing verified

## What's NOT in Session 1

These are planned for Sessions 2 and 3:

- React dashboard (Session 2)
- WebSocket real-time updates (Session 2)
- Dashboard UI for all views (Session 2)
- Anomaly detection engine (Session 3)
- Trigger actions system (Session 3)
- Report generation (Session 3)
- Additional providers (Session 3)
- npm package publishing (Session 3)

## How to Use Session 1

### Start the Proxy Server

```bash
npm start
```

You should see the branded ToastyKey banner.

### Add API Keys

```bash
# For OpenAI
node tests/manual-openai-test.js setup

# For Anthropic
node tests/manual-anthropic-test.js setup
```

Or via HTTP:

```bash
curl -X POST http://localhost:4000/vault/add \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "label": "default",
    "key": "sk-..."
  }'
```

### Proxy Your API Calls

Instead of:
```
https://api.openai.com/v1/chat/completions
```

Use:
```
http://localhost:4000/openai/v1/chat/completions
```

ToastyKey will:
1. Log the request
2. Check budgets (basic check for now)
3. Forward with your real API key
4. Calculate the cost
5. Log the response
6. Return data unchanged

### Check Your Spending

```bash
curl http://localhost:4000/stats
```

### Connect to Claude Code

1. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "toastykey": {
      "command": "node",
      "args": ["/Users/bakatoast/Toasty OS/toastykey/src/index.js", "mcp"]
    }
  }
}
```

2. Restart Claude Code

3. Ask: "How much have I spent today?"

## Database Location

```
toastykey.db
```

To inspect:
```bash
sqlite3 toastykey.db

# Example queries
SELECT * FROM api_calls ORDER BY timestamp DESC LIMIT 5;
SELECT provider, SUM(cost_inr) FROM api_calls GROUP BY provider;
SELECT * FROM api_keys;
```

## Architecture Overview

```
┌─────────────────┐
│   Your Code     │
│   or Claude     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ToastyKey      │
│  Proxy Server   │◄─── Vault (encrypted keys)
│  localhost:4000 │
└────────┬────────┘
         │
         ├──► SQLite (logs every call)
         ├──► Pricing Engine (calculates cost)
         │
         ▼
┌─────────────────┐
│   Real API      │
│ (OpenAI/Claude) │
└─────────────────┘
         │
         ▼
    (Response flows back unchanged)
```

## Session 2 Preview

Next session will build:
- React dashboard with 5 views
- Real-time WebSocket updates
- Visual budget status
- Key vault UI
- Project drilling
- Session tracking UI

## Deployment Notes

For production use:
- Move `toastykey.db` to a persistent location
- Set up proper environment variables
- Consider running as a system service
- Back up the database regularly (contains encrypted keys)

## Performance Notes

- SQLite is fast enough for personal/small team use
- WAL mode enabled for concurrent reads
- Indexes on timestamp, provider, project
- No memory leaks detected in testing

## Known Limitations

- Budget checking is basic (doesn't enforce yet)
- Session tracking requires manual session IDs
- No rate limiting on proxy
- No request caching
- Pricing data needs manual updates

These will be addressed in Sessions 2-3.

---

**Session 1 Status: COMPLETE ✓**

Ready for Session 2 when you are!
