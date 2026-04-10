# Hacker News — Show HN Draft

**Title:** Show HN: ToastyKey – Local proxy that tracks AI API costs in real-time, with MCP tools for Claude Code

---

ToastyKey is a local proxy server + React dashboard for tracking AI API costs across OpenAI, Anthropic, ElevenLabs, Cartesia, Replicate, and Stability AI.

The proxy runs on localhost:4000. You change one env var per project (e.g., `OPENAI_BASE_URL=http://localhost:4000/openai/v1`). The proxy forwards your requests transparently, parses responses for usage metrics, calculates cost using model-level pricing, logs to SQLite, and fires anomaly triggers if thresholds are breached.

The dashboard (React 18, Vite, Recharts) runs on localhost:3000 with real-time updates via Socket.io.

What's different from Helicone/Portkey:
- Fully local — SQLite, no telemetry, no cloud account required
- Ships as an MCP server: Claude Code can query its own costs via 13 exposed tools (`get_spend_summary`, `set_budget`, `pause_provider`, etc.)
- Anomaly detection with configurable actions: rate spikes, cost spikes, error storms, token explosions, silent drain, new provider detection. Actions include auto-pause and auto-kill.
- Encrypted key vault (AES-256-GCM) that auto-detects existing API keys from .env files

The MCP integration was the most interesting part. The same Node.js process runs both the Express proxy and the MCP stdio server — you start it differently based on argv[2]. Claude Code connects via stdio transport and can now ask "how much have I spent today?" or "pause Anthropic if I hit $10" mid-conversation.

148 tests, MIT license.

https://github.com/Knitefyre/toastykey

---

**First comment to post:**

I built this primarily because I kept running Claude Code sessions for hours without knowing what they actually cost. The Anthropic dashboard gives you aggregate numbers but nothing per-project or per-session.

The trigger system was driven by a real incident where I had a broken tool implementation causing an agent to retry a failing API call in a loop for 20 minutes. The "error storm" trigger type specifically catches this: if >50% of your calls in a rolling window are failing, it fires. You can configure it to auto-pause or webhook a Slack/Discord channel.

The hardest part technically was getting the per-provider response parsing right. OpenAI's streaming responses are different from their non-streaming responses, and both are different from the image generation and audio endpoints. Each handler has to know which endpoint it's dealing with and extract the right usage fields.

Happy to answer technical questions about any part of the stack.
