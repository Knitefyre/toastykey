---
title: I tracked my AI development costs for 30 days. Here's what I found (and the tool I built to do it).
published: true
description: After months of mystery AI API bills, I built ToastyKey — a local proxy that tracks every OpenAI, Anthropic, and ElevenLabs call in real-time. Here's what 30 days of data revealed.
tags: ai, opensource, javascript, devtools
cover_image: https://opengraph.githubassets.com/1/Knitefyre/toastykey
---

I've been building AI-powered applications for about a year. During that time, my Anthropic and OpenAI bills have ranged from $3 to $47 in a single month — and for most of that time, I had no idea why.

Not because I wasn't paying attention. I just had no visibility. The Anthropic dashboard shows you aggregate spend. The OpenAI dashboard shows you spend by model. Neither tells you what a specific Claude Code session cost, what your most expensive project is, or whether an agent that's been running for 3 hours is consuming $2 or $200.

So I built **ToastyKey** — a local proxy server that intercepts every AI API call, calculates the cost in real-time, and serves a dashboard. Here's what 30 days of tracking revealed about my AI development costs — and how you can track yours.

---

## The Setup

ToastyKey is a transparent proxy. Install it, change one environment variable per project, and every API call flows through it:

```bash
npm install -g toastykey
toastykey  # starts proxy on :4000, dashboard on :3000
```

Then in each project's `.env`:

```bash
# Before
OPENAI_BASE_URL=https://api.openai.com/v1

# After — identical behavior, now tracked
OPENAI_BASE_URL=http://localhost:4000/openai/v1
ANTHROPIC_BASE_URL=http://localhost:4000/anthropic
```

Your code doesn't change. The SDK doesn't change. The proxy forwards requests transparently, parses the response to extract usage data, calculates cost using model-level pricing, and logs everything to a local SQLite database.

---

## 30 Days of Data: What I Found

### Finding 1: Claude Code sessions are expensive but predictable

A typical 2-3 hour Claude Code session building a feature costs me between ₹800 and ₹2,000 (~$10–24). That's higher than I expected, but it's predictable once you see the pattern.

What I didn't expect: the cost is heavily front-loaded. The first 30 minutes of a session — where Claude is reading context, understanding the codebase, and making its first moves — consumes about 40% of the total token budget. The subsequent work is more efficient because the context is warm.

**Implication:** A 6-hour session doesn't cost 3× a 2-hour session. It costs maybe 2× because the context reading is amortized.

### Finding 2: The most expensive thing I do is iterate on prompts

I expected complex multi-tool agent runs to dominate my costs. They don't. The most expensive thing I do is iterate on a system prompt or chain of thought — especially for vision tasks where I'm uploading images repeatedly to test different prompting approaches.

One afternoon of iterating on a DALL-E 3 image generation prompt cost me ₹1,200. I had no idea until I saw it in the dashboard.

### Finding 3: Error storms are real and expensive

Twice in 30 days, I had what I'd call an "error storm" — where a broken tool implementation caused an agent to retry a failing API call in a loop. The worst one: 47 calls to the Anthropic API in 8 minutes, all returning 400 errors, costing ₹340 before I noticed.

ToastyKey's anomaly detection now catches this automatically. The "error storm" trigger fires when >50% of calls in a rolling 10-minute window are failing. The action: auto-pause. I've never had another uncaught error storm.

### Finding 4: I was using expensive models for cheap tasks

The recommendations engine in ToastyKey generates a report after each week showing which models I'm using heavily. It flagged that 23% of my Anthropic calls were to `claude-opus` for tasks that were essentially "classify this text into one of three categories" — tasks that claude-haiku handles just as well at 1/10 the price.

Switching those tasks to the cheaper model saved me about ₹400/month.

### Finding 5: My projects have wildly different cost profiles

| Project | Monthly Cost | Dominant Provider | Calls |
|---------|-------------|-------------------|-------|
| my-saas-app | ₹691 | OpenAI (GPT-4o) | 94 |
| side-project | ₹684 | Anthropic | 93 |
| toastykey-dev | ₹738 | Anthropic | 102 |
| jebbee-pipeline | ₹673 | Stability AI | 80 |
| spazi-website | ₹658 | ElevenLabs | 91 |

The pipeline project uses Stability AI heavily for image generation — I hadn't realized it was my most expensive project until I saw the breakdown.

---

## Building ToastyKey: Technical Overview

If you're curious about the implementation:

**Proxy architecture:**
- Express.js proxy on port 4000
- Per-provider handlers with response parsing for usage extraction
- SQLite (better-sqlite3) for local storage — no external DB
- Socket.io for real-time dashboard updates
- Sub-millisecond overhead on request forwarding

**Dashboard:**
- React 18 + Vite on port 3000
- Recharts for trend charts
- Tailwind CSS with dark glass-morphism design
- Real-time WebSocket subscriptions for live cost updates

**MCP integration:**
- `@modelcontextprotocol/sdk` — same process handles both HTTP and MCP stdio
- 13 tools exposed to Claude Code: `get_spend_summary`, `set_budget`, `pause_provider`, `get_recommendations`, and more
- Claude Code can now query its own costs mid-conversation

**Anomaly detection:**
- Rolling baseline tracking per provider
- 6 trigger types: rate spike, cost spike, error storm, token explosion, silent drain, new provider
- 6 action types: log, dashboard notify, Claude Code alert, auto-pause, auto-kill, webhook
- Configurable thresholds and cooldown periods

**Key vault:**
- AES-256-GCM encryption with machine ID-derived key
- Auto-scan filesystem for `.env` files
- Keys never leave the machine

---

## Getting Started

```bash
# Install
npm install -g toastykey

# Try with demo data first
toastykey --demo
cp toastykey-demo.db toastykey.db
toastykey

# Open the dashboard
open http://localhost:3000
```

Then change your base URLs, set a budget, add some triggers, and watch your costs in real-time.

GitHub: [https://github.com/Knitefyre/toastykey](https://github.com/Knitefyre/toastykey)
npm: `npm install -g toastykey`

It's MIT licensed, all data stays local, 148 tests passing. Would love feedback from other developers running AI agents heavily — what metrics would you want that this doesn't track?

---

*Keywords: how to track AI API costs, monitor Claude Code spending, prevent AI agent overspending, OpenAI spending monitor, local API proxy, AI development costs, MCP server for cost tracking*
