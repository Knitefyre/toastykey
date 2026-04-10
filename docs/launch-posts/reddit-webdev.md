# r/webdev — Post Draft

**Title:** I built a local API cost monitoring proxy for AI development — React dashboard, MCP server, anomaly detection, SQLite — open source

---

Hey r/webdev,

Built something over the past few weeks that's been genuinely useful to me as an AI-heavy developer and figured some of you might like it.

**ToastyKey** — a local proxy server that intercepts all your AI API calls, logs them to SQLite, and serves a real-time dashboard. Think Helicone but it runs on your machine and costs nothing.

**Technical architecture:**

- **Proxy layer:** Express.js on port 4000. Per-provider request handlers (OpenAI, Anthropic, ElevenLabs, Cartesia, Replicate, Stability AI, generic). Intercepts the request, forwards it to the real API, parses the response to extract usage metrics, logs to SQLite, checks budget triggers, returns the unmodified response. Sub-millisecond overhead.

- **Dashboard:** React 18 + Vite on port 3000. Dark glass-morphism aesthetic (Tailwind, `#09090B` base). Recharts for spend trends. Real-time updates via Socket.io. Components: Overview (stat cards, spend chart, provider breakdown, tangible outputs), Projects (auto-detected per-project costs), Key Vault, Anomaly Detection, Reports, Settings.

- **MCP server:** `@modelcontextprotocol/sdk` exposing 13 tools to Claude Code. `get_spend_summary`, `set_budget`, `pause_provider`, `get_recommendations`, etc. Claude can query its own API costs mid-conversation.

- **Anomaly detection:** Six trigger types with configurable thresholds and six action types. Rolling baseline tracking. Fires webhook/auto-pause/kill when thresholds breach.

- **Key vault:** AES-256-GCM encryption. Machine ID-derived key. Auto-scan `.env` files to detect existing provider keys.

- **Pricing engine:** Model-level pricing for every OpenAI and Anthropic model, input/output token differentiation, image generation pricing, audio character pricing for ElevenLabs/Cartesia.

**The proxy is zero-change transparent:**
```bash
# Before
OPENAI_BASE_URL=https://api.openai.com/v1

# After — one env var, same code
OPENAI_BASE_URL=http://localhost:4000/openai/v1
```

148 tests passing. SQLite so no external DB dependency. Vite proxy for dev so no CORS issues. The MCP server doubles as the main server — single process handles both.

GitHub: https://github.com/Knitefyre/toastykey
npm: `npm install -g toastykey`

Happy to go deep on any part of the architecture. The MCP integration was the most interesting part to figure out — it's surprisingly elegant once you understand the stdio transport pattern.

---

*Tags: javascript, nodejs, react, ai, developer-tools, open-source*
