# r/ClaudeAI — Post Draft

**Title:** I built a local cost tracker for Claude Code — shows you exactly what each session costs, with budget alerts that can auto-pause your agent

---

Hey r/ClaudeAI,

I kept getting surprised by my Anthropic bills. Not huge surprises, but enough that I'd finish a session and wonder "wait, how much did that actually cost me?" Claude Code is incredible but it's genuinely hard to track what you're spending across projects, especially when you have multiple agents running.

So I built **ToastyKey** — a local proxy + MCP server that sits between your code and every AI provider and logs every API call in real-time.

**How it works:**
1. Run `npm install -g toastykey` and `toastykey` to start the proxy on localhost:4000
2. Change one env var: `ANTHROPIC_BASE_URL=http://localhost:4000/anthropic`
3. Open the dashboard at localhost:3000 — every call shows up in real-time with cost, model, tokens, latency

**The part I'm most proud of:** ToastyKey is an MCP server. So Claude Code itself can query its own costs:

> "How much have I spent today?" → ₹2,847
> "Which project is most expensive?" → toastykey-dev: ₹738
> "Set a daily budget of ₹5,000 for this project" → Done

**The anomaly detection is clutch.** You can set triggers like:
- "Alert me if my call rate spikes 5x in 2 minutes" (catches runaway loops)
- "Pause Anthropic if error rate hits 50%" (catches broken prompts burning money)
- "Kill everything if I spend 3x my hourly average" (emergency stop)

It also has an encrypted key vault (AES-256-GCM) that auto-detects keys from your .env files. All data stays local — SQLite, zero telemetry, zero cloud.

**Supported providers:** OpenAI, Anthropic, ElevenLabs, Cartesia, Replicate, Stability AI, plus a generic proxy for anything else.

GitHub: https://github.com/Knitefyre/toastykey

Would love feedback from the Claude Code heavy users here — what costs would you want to track that this doesn't cover yet?

---

*Tags to use: #ClaudeCode #OpenSource #DeveloperTools*
