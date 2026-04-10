# Product Hunt — Launch Draft

## Product Name
ToastyKey

## Tagline
Track every AI API call. Stop runaway agents. Control your costs.

## Description (260 chars max)
ToastyKey is a local proxy + dashboard that tracks every OpenAI, Anthropic, ElevenLabs and more API call you make — with budget alerts, anomaly detection, an encrypted key vault, and MCP tools so Claude Code can monitor its own costs.

## Topics
Developer Tools, Artificial Intelligence, Open Source, Productivity

## Gallery captions
1. Overview dashboard — real-time spend, provider breakdown, tangible output counters
2. Projects view — per-project cost attribution, auto-detected from API calls
3. Anomaly detection — configure triggers that auto-pause agents before they overspend
4. Key vault — AES-256-GCM encrypted storage, auto-detect from .env files
5. Reports — generate weekly/monthly cost reports with provider breakdown and recommendations

---

## Maker's First Comment

Hey Product Hunt! 👋

I built ToastyKey because I kept losing track of what my AI development sessions were actually costing. Not in a dramatic way — just the slow bleed of not knowing whether a 3-hour Claude Code session cost me $2 or $20.

**The core insight:** AI API costs are invisible until they're not. You're deep in a coding session, your agent is running tools, calling APIs, retrying failures — and you have no idea what's happening until the Anthropic billing page updates.

ToastyKey fixes this with a transparent local proxy. Change one env var, and every API call is now tracked, priced, and logged to SQLite on your machine. No cloud account. No monthly fee. No data ever leaves your machine.

**The features I'm most proud of:**

🔥 **MCP integration** — ToastyKey is a Model Context Protocol server. Claude Code can literally ask "how much have I spent today?" and get a real answer. This is the future of AI development tooling — agents that are aware of their own resource consumption.

⚡ **Anomaly detection** — Six trigger types that watch for unusual patterns. The one I use most: "rate spike" — if my call frequency suddenly jumps 5x, something is probably looping and I want to know immediately, not after the damage is done.

🔐 **Key vault** — All my API keys in one encrypted place. It scans your filesystem for .env files and imports them. No more copy-pasting keys across projects.

**It's free and open source** — MIT license, 148 tests passing, runs entirely on your machine.

`npm install -g toastykey` to get started.

Would love your feedback — especially from people running Claude Code or AI agents heavily. What costs do you wish you could track that this doesn't cover?

GitHub: https://github.com/Knitefyre/toastykey

---

## Pricing
Free (Open Source)

## Website
https://github.com/Knitefyre/toastykey
