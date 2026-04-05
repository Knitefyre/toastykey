# ToastyKey Session 2: React Dashboard and Real-time Updates - Design Specification

**Date:** 2026-04-04  
**Author:** Claude Sonnet 4.5  
**Status:** Draft  
**Session:** 2 of 3

---

## Executive Summary

Session 2 builds the visual layer for ToastyKey: a premium React dashboard with real-time WebSocket updates, 5 core views, and a first-time setup wizard. The dashboard serves on localhost:3000 and provides complete visibility into API costs, projects, key management, and budget tracking.

**What We're Building:**
- React dashboard using Vite + Tailwind CSS
- Real-time updates via Socket.io
- 5 views: Overview, Projects, Key Vault, Triggers (placeholder), Reports (placeholder)
- Setup wizard with smart detection (no keys + no API calls)
- REST API endpoints for dashboard data
- Hybrid deployment (dev: separate processes, prod: integrated)

**Design System:** Professional developer tool aesthetic (Vercel dashboard quality + terminal feel) using UI/UX Pro Max recommendations.

---

## Architecture Overview

### **Project Structure**

```
toastykey/
├── src/
│   ├── dashboard/                    # NEW: React app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Sidebar.jsx
│   │   │   │   │   ├── Header.jsx
│   │   │   │   │   └── Layout.jsx
│   │   │   │   ├── stats/
│   │   │   │   │   ├── StatCard.jsx
│   │   │   │   │   ├── SpendChart.jsx
│   │   │   │   │   ├── ProviderBreakdown.jsx
│   │   │   │   │   ├── TangibleOutputs.jsx
│   │   │   │   │   └── BudgetProgress.jsx
│   │   │   │   ├── activity/
│   │   │   │   │   ├── ActivityFeed.jsx
│   │   │   │   │   └── ActivityItem.jsx
│   │   │   │   ├── vault/
│   │   │   │   │   ├── KeyCard.jsx
│   │   │   │   │   ├── KeyTable.jsx
│   │   │   │   │   ├── AddKeyModal.jsx
│   │   │   │   │   └── ImportEnvModal.jsx
│   │   │   │   ├── wizard/
│   │   │   │   │   ├── SetupWizard.jsx
│   │   │   │   │   ├── WizardStep.jsx
│   │   │   │   │   ├── WelcomeStep.jsx
│   │   │   │   │   ├── KeyImportStep.jsx
│   │   │   │   │   ├── BudgetStep.jsx
│   │   │   │   │   └── MCPConfigStep.jsx
│   │   │   │   ├── common/
│   │   │   │   │   ├── Button.jsx
│   │   │   │   │   ├── Card.jsx
│   │   │   │   │   ├── Modal.jsx
│   │   │   │   │   ├── Toast.jsx
│   │   │   │   │   ├── Badge.jsx
│   │   │   │   │   └── Skeleton.jsx
│   │   │   │   └── charts/
│   │   │   │       ├── AreaChart.jsx
│   │   │   │       ├── BarChart.jsx
│   │   │   │       └── LineChart.jsx
│   │   │   ├── views/
│   │   │   │   ├── Overview.jsx
│   │   │   │   ├── Projects.jsx
│   │   │   │   ├── ProjectDetail.jsx
│   │   │   │   ├── KeyVault.jsx
│   │   │   │   ├── Triggers.jsx
│   │   │   │   └── Reports.jsx
│   │   │   ├── contexts/
│   │   │   │   ├── AppContext.jsx          # Global state + WebSocket
│   │   │   │   └── ToastContext.jsx        # Toast notifications
│   │   │   ├── hooks/
│   │   │   │   ├── useWebSocket.js
│   │   │   │   ├── useAPI.js
│   │   │   │   └── useFormatting.js
│   │   │   ├── services/
│   │   │   │   ├── api.js                  # API client
│   │   │   │   └── formatters.js           # Number/date formatting
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── tailwind.config.js
│   │   └── postcss.config.js
│   ├── proxy/                        # EXISTING (enhanced)
│   │   ├── api/                      # NEW: Dashboard API routes
│   │   │   ├── stats.js
│   │   │   ├── vault.js
│   │   │   ├── budgets.js
│   │   │   ├── projects.js
│   │   │   └── setup.js
│   │   ├── websocket.js              # NEW: Socket.io server
│   │   ├── index.js                  # Enhanced with API routes
│   │   ├── middleware.js
│   │   └── handlers/                 # Enhanced with WebSocket broadcasts
│   │       ├── openai.js
│   │       └── anthropic.js
│   ├── db/, vault/, tracker/, mcp/   # EXISTING (unchanged)
│   └── index.js                       # Enhanced for hybrid serving
├── package.json                       # Root (adds dashboard scripts)
└── README.md
```

### **Deployment Model**

**Development (Hybrid):**
- Terminal 1: `npm start` - Proxy server on port 4000
- Terminal 2: `npm run dashboard:dev` - Vite dev server on port 3000
- WebSocket server integrated into proxy (port 4000)
- Dashboard connects to http://localhost:4000 for API/WebSocket

**Production (Integrated):**
- Single process: `npm start` (NODE_ENV=production)
- Proxy serves API on port 4000 + serves static dashboard on port 3000
- Built React app served from src/dashboard/dist

---

## Visual Design System

### **Color Palette (UI/UX Pro Max Recommendation: Developer Tool / IDE)**

```css
/* Base Colors - Professional Dark Theme */
--bg-primary: #0F172A;      /* Main background */
--bg-surface: #1B2336;      /* Cards, sidebar */
--bg-hover: #272F42;        /* Hover states */
--border: #475569;          /* Borders */

/* Text - WCAG AAA Compliant */
--text-primary: #F8FAFC;    /* Headlines, main text */
--text-secondary: #94A3B8;  /* Labels, metadata */
--text-muted: #64748B;      /* Disabled, de-emphasized */

/* Semantic Colors */
--success: #22C55E;         /* Green - success, active, primary CTA */
--warning: #F59E0B;         /* Amber - warnings, approaching limits */
--error: #EF4444;           /* Red - errors, budget exceeded */
--info: #3B82F6;            /* Blue - links, info */

/* Provider Branding */
--openai: #22C55E;          /* Green for OpenAI */
--anthropic: #F59E0B;       /* Amber for Anthropic */
```

**Rationale:**
- Selected by UI/UX Pro Max based on "Developer Tool / IDE" product type
- Pre-tested for WCAG AA/AAA contrast ratios
- Optimized for dark mode readability and reduced eye strain
- Better than generic dark palettes for long coding sessions

### **Typography (Fira Code / Fira Sans)**

```css
/* Google Fonts Import */
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');

/* Headings & Data (Fira Code - Monospace) */
font-family: 'Fira Code', monospace;
/* Use for: large numbers, stat cards, data tables, code-like elements */

/* Body Text (Fira Sans - Sans-Serif) */
font-family: 'Fira Sans', sans-serif;
/* Use for: descriptions, labels, body content, navigation */

/* Type Scale */
--text-xs: 0.75rem;    /* 12px - timestamps, badges */
--text-sm: 0.875rem;   /* 14px - body text, table data */
--text-base: 1rem;     /* 16px - default */
--text-lg: 1.125rem;   /* 18px - subheadings */
--text-xl: 1.25rem;    /* 20px - section headings */
--text-2xl: 1.5rem;    /* 24px - page titles */
--text-4xl: 2.25rem;   /* 36px - hero numbers in stat cards */
```

**Rationale:**
- Recommended by UI/UX Pro Max for dashboard/analytics products
- Fira Code: monospace perfection for numbers and data
- Fira Sans: pairs perfectly, maintains technical aesthetic
- Superior readability over JetBrains Mono for long text

### **Spacing & Layout**

```css
/* 8px Grid System */
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-12: 3rem;    /* 48px */

/* Border Radius */
--radius-sm: 0.25rem;  /* 4px - badges */
--radius-md: 0.5rem;   /* 8px - buttons, cards */
--radius-lg: 0.75rem;  /* 12px - modals */

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
```

### **Animation Standards (UI/UX Pro Max Guidelines)**

```css
/* Micro-interactions: 150-300ms */
transition: all 200ms ease-out;

/* Entering elements: ease-out */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Exiting elements: ease-in (faster) */
@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}

/* Loading states: skeleton/pulse only */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Animation Rules:**
- ✅ Use transform/opacity only (not width/height/top/left)
- ✅ 150-300ms for micro-interactions
- ✅ Skeleton screens for loading >300ms
- ✅ Animate max 1-2 elements per view
- ❌ No decorative animations
- ❌ No animations >500ms
- ❌ No hover-only interactions (must work on touch)

### **Responsive Breakpoints**

```css
/* Mobile-first approach */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */

/* Sidebar behavior */
- < 768px: Collapsed by default, overlay when open
- >= 768px: Always visible, can toggle collapse to icon-only
```

---

## REST API Endpoints

All dashboard API routes served at `/api/*` by the Express proxy server:

### **Stats & Analytics**

**GET /api/stats**
- Overview stats (today, week, month)
- Response:
```json
{
  "today": {
    "total_inr": 1247,
    "total_usd": 14.67,
    "delta_vs_yesterday": 0.23,
    "call_count": 47
  },
  "month": {
    "total_inr": 12470,
    "total_usd": 146.70,
    "call_count": 523
  },
  "active_projects": 3,
  "active_keys": 2
}
```

**GET /api/stats/daily?days=30**
- Daily spend array for charts
- Response:
```json
{
  "daily": [
    { "date": "2026-03-05", "total_inr": 450, "total_usd": 5.29, "openai": 300, "anthropic": 150 },
    { "date": "2026-03-06", "total_inr": 680, "total_usd": 8.00, "openai": 500, "anthropic": 180 }
  ]
}
```

**GET /api/stats/providers**
- Breakdown by provider
- Response:
```json
{
  "providers": [
    { "provider": "openai", "total_inr": 8340, "total_usd": 98.12, "call_count": 342, "percentage": 67 },
    { "provider": "anthropic", "total_inr": 4130, "total_usd": 48.58, "call_count": 181, "percentage": 33 }
  ]
}
```

**GET /api/stats/tangible**
- Human-readable outputs (images, calls, audio)
- Response:
```json
{
  "outputs": [
    { "type": "images", "count": 47, "cost_inr": 182 },
    { "type": "llm_calls", "count": 1247, "cost_inr": 890 },
    { "type": "audio_minutes", "count": 12, "cost_inr": 340 }
  ]
}
```
- Note: Frontend maps types to Lucide icons (Image, MessageSquare, Music)

**GET /api/stats/calls?limit=20&offset=0**
- Recent API calls feed
- Response:
```json
{
  "calls": [
    {
      "id": 1234,
      "timestamp": "2026-04-04T10:23:45Z",
      "provider": "openai",
      "endpoint": "/v1/chat/completions",
      "model": "gpt-4o-mini",
      "project": "toastykey",
      "cost_inr": 2.5,
      "cost_usd": 0.029,
      "status": 200,
      "latency_ms": 487
    }
  ],
  "total": 523
}
```

### **Projects**

**GET /api/projects**
- All projects with costs
- Response:
```json
{
  "projects": [
    {
      "id": 1,
      "name": "toastykey",
      "directory_path": "/Users/bakatoast/Toasty OS/toastykey",
      "total_cost": 12470,
      "total_cost_usd": 146.70,
      "cost_this_month": 1247,
      "last_active": "2026-04-04T10:23:45Z",
      "call_count": 523
    }
  ]
}
```

**GET /api/projects/:id**
- Single project detail + sessions
- Response:
```json
{
  "project": {
    "id": 1,
    "name": "toastykey",
    "directory_path": "/Users/bakatoast/Toasty OS/toastykey",
    "total_cost": 12470,
    "created_at": "2026-03-01T00:00:00Z"
  },
  "cost_by_provider": [
    { "provider": "openai", "cost_inr": 8340 },
    { "provider": "anthropic", "cost_inr": 4130 }
  ],
  "cost_over_time": [
    { "date": "2026-03-05", "cost_inr": 450 }
  ],
  "sessions": [
    { "id": 42, "cost_inr": 340, "started_at": "2026-04-04T08:00:00Z", "call_count": 87 }
  ],
  "recent_calls": []
}
```

### **Key Vault**

**GET /api/vault/keys**
- List keys (masked by default)
- Response:
```json
{
  "keys": [
    {
      "id": 1,
      "provider": "openai",
      "label": "default",
      "masked_key": "sk-...a1b2",
      "status": "active",
      "last_used": "2026-04-04T10:23:45Z",
      "total_cost": 8340,
      "created_at": "2026-03-01T00:00:00Z"
    }
  ]
}
```

**POST /api/vault/keys**
- Add new key
- Body:
```json
{
  "provider": "openai",
  "label": "default",
  "key": "sk-proj-..."
}
```
- Response:
```json
{
  "success": true,
  "message": "Key added for openai (default)",
  "key_id": 1
}
```

**DELETE /api/vault/keys/:id**
- Delete key
- Response:
```json
{
  "success": true,
  "message": "Key deleted"
}
```

**POST /api/vault/keys/:id/reveal**
- Reveal full key (temporary)
- Response:
```json
{
  "key": "sk-proj-abc123...",
  "expires_at": "2026-04-04T10:24:45Z"
}
```

**POST /api/vault/import-env**
- Parse .env file, return found keys
- Body:
```json
{
  "content": "OPENAI_API_KEY=sk-...\nANTHROPIC_API_KEY=sk-ant-..."
}
```
- Response:
```json
{
  "found_keys": [
    { "provider": "openai", "key": "sk-...", "label": "default" },
    { "provider": "anthropic", "key": "sk-ant-...", "label": "default" }
  ]
}
```

### **Budgets**

**GET /api/budgets**
- All active budgets with status
- Response:
```json
{
  "budgets": [
    {
      "id": 5,
      "scope": "global",
      "period": "day",
      "limit_amount": 500,
      "current_spend": 450,
      "percentage": 90,
      "status": "warning"
    }
  ]
}
```

**POST /api/budgets**
- Create/update budget
- Body:
```json
{
  "scope": "global",
  "period": "day",
  "limit_amount": 500
}
```

### **Setup Wizard**

**POST /api/setup/scan**
- Scan directories for .env files
- Body:
```json
{
  "directories": [
    "/Users/bakatoast/Desktop",
    "/Users/bakatoast/Documents",
    "/Users/bakatoast/Projects"
  ]
}
```
- Response:
```json
{
  "found_files": [
    {
      "path": "/Users/bakatoast/Projects/app/.env",
      "keys": [
        { "provider": "openai", "key": "sk-...", "label": "app" }
      ]
    }
  ]
}
```

**GET /api/setup/status**
- Check if setup needed (no keys + no API calls)
- Response:
```json
{
  "needs_setup": true,
  "reason": "no_keys_and_no_calls"
}
```

### **Health**

**GET /api/health**
- Server health check
- Response:
```json
{
  "status": "ok",
  "service": "toastykey-api",
  "version": "0.2.0",
  "uptime": 12345
}
```

---

## WebSocket Protocol (Socket.io)

### **Server Events (Emitted to Clients)**

**`api_call`** - On API call completion
```javascript
socket.emit('api_call', {
  id: 1234,
  timestamp: "2026-04-04T10:23:45Z",
  provider: "openai",
  endpoint: "/v1/chat/completions",
  model: "gpt-4o-mini",
  project: "toastykey",
  cost_inr: 2.5,
  cost_usd: 0.029,
  status: 200,
  latency_ms: 487
});
```

**`budget_update`** - On budget threshold crossed
```javascript
socket.emit('budget_update', {
  budget_id: 5,
  scope: "global",
  period: "day",
  current_spend: 450,
  limit: 500,
  percentage: 90,
  status: "warning"
});
```

**`vault_update`** - On key added/deleted
```javascript
socket.emit('vault_update', {
  action: "added",  // or "deleted"
  provider: "openai",
  label: "default",
  key_id: 1
});
```

### **Client Connection**

```javascript
// Dashboard connects on mount
const socket = io('http://localhost:4000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity
});

socket.on('connect', () => {
  console.log('WebSocket connected');
});

socket.on('disconnect', () => {
  console.log('WebSocket disconnected, will auto-reconnect');
});

socket.on('api_call', (data) => {
  // Prepend to activity feed
  // Update stats
});

socket.on('budget_update', (data) => {
  // Update budget progress bars
});

socket.on('vault_update', (data) => {
  // Refresh key list
});
```

### **Backend Integration Points**

**Where to emit WebSocket events:**

1. **In proxy handlers** (`src/proxy/handlers/openai.js`, `anthropic.js`):
   - After logging to database, emit `api_call` event
   - After budget check, if threshold crossed, emit `budget_update`

2. **In vault endpoints** (`src/proxy/api/vault.js`):
   - After adding key, emit `vault_update`
   - After deleting key, emit `vault_update`

---

## Dashboard Views

### **View 1: Overview (Home Page - Most Important)**

**Purpose:** At-a-glance visibility into spending, activity, and budget status.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ [4 Stat Cards in Row]                                   │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ Today    │ │ Month    │ │ Projects │ │ Keys     │   │
│ │ ₹1,247   │ │ ₹12,470  │ │ 3        │ │ 2        │   │
│ │ ↑ 23%    │ │          │ │          │ │          │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────────────────┤
│ [Spend Chart - Area, 30 days, toggle USD/INR]          │
│                                                         │
│              /\        /\                               │
│             /  \      /  \    /\                        │
│         /\/    \    /    \  /  \                        │
│       /          \/        \/    \___                   │
│                                                         │
├──────────────────────────┬──────────────────────────────┤
│ Provider Breakdown       │ Tangible Outputs             │
│ [Horizontal Bars]        │ [Card Grid]                  │
│ OpenAI  ████████░░ 80%   │ [Icon] 47 images (₹182)     │
│ Anthropic ███░░░░ 20%    │ [Icon] 1,247 calls (₹890)   │
│                          │ [Icon] 12 min audio (₹340)  │
│                          │ (Icons: Lucide React)        │
├──────────────────────────┴──────────────────────────────┤
│ Budget Status                                           │
│ [Progress Bars with Color Coding]                      │
│ Global Daily  ████████░░ 90% (₹450/₹500) RED           │
│ Project A     ████░░░░░░ 45% (₹225/₹500) GREEN         │
├─────────────────────────────────────────────────────────┤
│ Recent Activity [Live Feed - WebSocket]                │
│ • 2m ago  [OpenAI] /chat/completions  ₹2.5  ✓         │
│ • 5m ago  [Anthropic] /messages       ₹8.2  ✓         │
│ • 12m ago [OpenAI] /images            ₹15.0 ✓         │
│ [New items animate in from top]                        │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- `StatCard` - Large number, label, optional delta with arrow
- `SpendChart` - Recharts AreaChart, 30 days, toggle USD/INR, tooltip on hover
- `ProviderBreakdown` - Horizontal bar chart, sorted descending
- `TangibleOutputs` - Grid of cards with icon + count + cost
- `BudgetProgress` - Progress bar with dynamic color (green <60%, amber 60-80%, red 80%+)
- `ActivityFeed` - Live-updating list, relative times, prepend new items with animation

**Data Sources:**
- `/api/stats` - stat cards
- `/api/stats/daily?days=30` - spend chart
- `/api/stats/providers` - provider breakdown
- `/api/stats/tangible` - tangible outputs
- `/api/budgets` - budget status
- `/api/stats/calls?limit=20` - recent activity
- WebSocket: `api_call`, `budget_update` - real-time updates

### **View 2: Projects**

**Purpose:** Track costs per project, drill into project details.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Projects                                    [+ New]     │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐              │
│ │ toastykey        │ │ my-app           │              │
│ │ ~/Toasty OS/...  │ │ ~/Desktop/...    │              │
│ │ ₹12,470 lifetime │ │ ₹5,230 lifetime  │              │
│ │ ₹1,247 this month│ │ ₹890 this month  │              │
│ │ Active 2h ago    │ │ Active 1d ago    │              │
│ │ 523 calls        │ │ 89 calls         │              │
│ └──────────────────┘ └──────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

**Drill-down (Project Detail):**
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Projects                                      │
│ toastykey                                               │
│ ~/Toasty OS/toastykey                                   │
├─────────────────────────────────────────────────────────┤
│ Total: ₹12,470  |  This Month: ₹1,247  |  523 calls   │
├──────────────────────────┬──────────────────────────────┤
│ Cost by Provider (Pie)   │ Cost Over Time (Line)       │
├──────────────────────────┴──────────────────────────────┤
│ Sessions                                                │
│ • Session #42  ₹340  2h ago  87 calls                  │
│ • Session #41  ₹120  1d ago  23 calls                  │
├─────────────────────────────────────────────────────────┤
│ Recent Calls (from this project)                       │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- `ProjectCard` - Grid card with project stats, clickable
- `ProjectDetail` - Full view with Recharts PieChart + LineChart
- Session list with cost per session

**Data Sources:**
- `/api/projects` - all projects
- `/api/projects/:id` - project detail

### **View 3: Key Vault**

**Purpose:** Manage API keys, view usage, add/delete keys.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Key Vault                        [+ Add Key] [Import]  │
├──────────┬────────┬────────┬──────────┬────────┬───────┤
│ Provider │ Label  │ Status │ Last Used│ Cost   │Actions│
├──────────┼────────┼────────┼──────────┼────────┼───────┤
│ 🟢 OpenAI│default │ Active │ 2m ago   │₹8,340  │ ⋯    │
│ sk-...a1b2 (masked)                            │[Copy] │
│                                                 │[Reveal]│
│                                                 │[Delete]│
├──────────┼────────┼────────┼──────────┼────────┼───────┤
│ 🟠 Anthro│primary │ Active │ 1h ago   │₹4,130  │ ⋯    │
│ sk-ant-...x9y8                                 │       │
└─────────────────────────────────────────────────────────┘
```

**Add Key Modal:**
```
┌─────────────────────────────────┐
│ Add API Key            [X]      │
├─────────────────────────────────┤
│ Provider: [OpenAI ▼]            │
│                                 │
│ Label:    [____________]        │
│                                 │
│ API Key:  [••••••••••••] [👁]   │
│                                 │
│           [Cancel] [Add Key]    │
└─────────────────────────────────┘
```

**Components:**
- `KeyTable` - Table with masked keys, status badges
- `KeyActions` - Dropdown with Copy/Reveal/Delete
- `AddKeyModal` - Form with provider dropdown (OpenAI, Anthropic, ElevenLabs, Cartesia, custom)
- `ImportEnvModal` - File picker, parse .env, show confirmation

**Reveal Logic:**
- Click "Reveal" → POST `/api/vault/keys/:id/reveal` → shows full key for 10 seconds → auto-mask
- Frontend timer, not server-side expiry

**Data Sources:**
- `/api/vault/keys` - list keys
- POST `/api/vault/keys` - add key
- DELETE `/api/vault/keys/:id` - delete key
- POST `/api/vault/keys/:id/reveal` - reveal key
- POST `/api/vault/import-env` - import from .env

### **View 4: Triggers (Placeholder - Session 3)**

**Purpose:** Scaffold for Session 3 anomaly detection and trigger system.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Triggers                                   Coming v0.3.0│
├─────────────────────────────────────────────────────────┤
│           🔔 Triggers Coming Soon                       │
│                                                         │
│ In v0.3.0, you'll be able to set up automated actions: │
│ • Budget alerts via email/Slack                         │
│ • Anomaly detection notifications                       │
│ • Cost spike warnings                                   │
│ • Unused key alerts                                     │
│                                                         │
│ [View Trigger Events Log] (if any exist in DB)         │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**
- Static placeholder with "Coming Soon" message
- If trigger_events table has data, show basic list
- No active functionality in Session 2

### **View 5: Reports (Placeholder - Session 3)**

**Purpose:** Scaffold for Session 3 report generation.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Reports                                    Coming v0.3.0│
├─────────────────────────────────────────────────────────┤
│           📊 Reports Coming Soon                        │
│                                                         │
│ In v0.3.0, you'll be able to generate:                 │
│ • Monthly cost reports                                  │
│ • Project summaries                                     │
│ • Provider usage analysis                               │
│ • Budget performance reports                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Setup Wizard

### **Trigger Logic (Smart Detection)**

```javascript
// Show wizard if: no keys AND no API calls in database
const shouldShowWizard = async () => {
  const { needs_setup } = await fetch('/api/setup/status').then(r => r.json());
  return needs_setup;
};

// Check on app mount
// If true, render SetupWizard instead of main dashboard
// After wizard completion, redirect to Overview
```

### **Wizard Flow (4 Steps)**

**Step 1: Welcome**
- Branded animation (optional)
- Brief explanation: "Track. Control. Understand."
- [Get Started →] button

**Step 2: Import API Keys**
- Three options:
  1. **Scan My Projects** - scans ~/Desktop, ~/Documents, ~/Projects, home dir for .env files
  2. **Add Manually** - provider dropdown + key input
  3. **Skip For Now** - go to empty dashboard
- Can add multiple keys before proceeding

**Step 3: Set Your First Budget (Optional)**
- Input field with suggested default: ₹500/day
- Checkbox: "Skip budget setup"
- Optional step, can skip

**Step 4: Connect to Claude Code**
- Shows MCP config snippet with actual path
- [Copy] button with checkmark feedback
- Instructions: "Add to Claude Code settings, then restart"
- [Go to Dashboard →] button

**Components:**
- `SetupWizard.jsx` - Container, step state management
- `WizardStep.jsx` - Wrapper with progress dots (1/4, 2/4, 3/4, 4/4)
- `WelcomeStep.jsx`
- `KeyImportStep.jsx` - Three options with conditional UI
- `BudgetStep.jsx` - Input with validation
- `MCPConfigStep.jsx` - Code block with copy button

**Re-run Wizard:**
- Settings → "Setup Wizard" option
- Shows even if user has keys/calls (manual override)

---

## Navigation (Sidebar)

### **Sidebar Structure**

```
┌──────────────────┐
│  🔥 ToastyKey   │  Logo (green text, Fira Code bold, flame emoji OK)
│                  │
│  ─────────────  │  Divider
│                  │
│  [•] Overview    │  Active: green accent line + green text
│  [•] Projects    │  Hover: subtle background
│  [•] Key Vault   │  (Icons shown as [•] for layout)
│  [•] Triggers    │  (Actual icons: see below)
│  [•] Reports     │
│                  │
│  [Flex Space]    │
│                  │
│  [•] Settings    │  Bottom section
│  [•] Collapse    │  Toggle button
└──────────────────┘
```
- Note: Emoji in logo (🔥) is acceptable for branding

**Specifications:**
- Width: 240px expanded, 64px collapsed
- Background: `--bg-surface` (#1B2336)
- Border right: 1px solid `--border`
- Position: fixed left

**Nav Items:**
- Icon (Lucide React, 20px) + Label (Fira Sans, 14px)
- Active state: 3px green accent line on left + green icon/text (#22C55E)
- Hover: background `--bg-hover` (#272F42)
- Transition: 200ms ease-out
- Padding: 12px 16px
- Gap: 12px between icon and label

**Collapsed State (Icon-Only, 64px):**
- Only icons visible
- Tooltip on hover (label appears)
- Active state: green icon only (no line)

**Responsive:**
- <768px: Collapsed by default, overlay when opened (hamburger menu)
- >=768px: Expanded by default, can toggle with collapse button
- State saved to localStorage

**Icons (Lucide React):**
- Overview: `BarChart3`
- Projects: `Folder`
- Key Vault: `Key`
- Triggers: `Bell`
- Reports: `FileText`
- Settings: `Settings`
- Collapse: `ChevronLeft` / `ChevronRight`

---

## State Management

### **Architecture: React Context + useReducer**

```javascript
// AppContext.jsx
const AppContext = createContext();

const initialState = {
  // Stats
  stats: null,
  dailySpend: [],
  providers: [],
  tangibleOutputs: [],
  budgets: [],
  
  // Activity Feed (live updates)
  recentCalls: [],
  
  // Projects
  projects: [],
  currentProject: null,
  
  // Keys
  keys: [],
  
  // UI State
  loading: false,
  error: null,
  websocketConnected: false,
  
  // Settings
  currency: 'INR', // or 'USD'
  sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true'
};

const actions = {
  // Data
  SET_STATS: 'SET_STATS',
  SET_DAILY_SPEND: 'SET_DAILY_SPEND',
  SET_PROVIDERS: 'SET_PROVIDERS',
  SET_TANGIBLE_OUTPUTS: 'SET_TANGIBLE_OUTPUTS',
  SET_BUDGETS: 'SET_BUDGETS',
  SET_PROJECTS: 'SET_PROJECTS',
  SET_CURRENT_PROJECT: 'SET_CURRENT_PROJECT',
  SET_KEYS: 'SET_KEYS',
  
  // Real-time updates
  ADD_API_CALL: 'ADD_API_CALL',        // Prepend to recentCalls + update stats
  UPDATE_BUDGET: 'UPDATE_BUDGET',      // Update specific budget
  UPDATE_VAULT: 'UPDATE_VAULT',        // Key added/deleted
  
  // UI
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_WEBSOCKET_STATUS: 'SET_WEBSOCKET_STATUS',
  TOGGLE_CURRENCY: 'TOGGLE_CURRENCY',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR'
};

function appReducer(state, action) {
  switch (action.type) {
    case actions.ADD_API_CALL:
      return {
        ...state,
        recentCalls: [action.payload, ...state.recentCalls].slice(0, 20),
        stats: {
          ...state.stats,
          today: {
            ...state.stats.today,
            total_inr: state.stats.today.total_inr + action.payload.cost_inr,
            call_count: state.stats.today.call_count + 1
          }
        }
      };
    
    case actions.UPDATE_BUDGET:
      return {
        ...state,
        budgets: state.budgets.map(b => 
          b.id === action.payload.budget_id 
            ? { ...b, ...action.payload } 
            : b
        )
      };
    
    case actions.TOGGLE_SIDEBAR:
      const collapsed = !state.sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', collapsed);
      return { ...state, sidebarCollapsed: collapsed };
    
    // ... other cases
    
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // WebSocket integration
  const { socket, connected } = useWebSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('api_call', (data) => {
      dispatch({ type: actions.ADD_API_CALL, payload: data });
    });
    
    socket.on('budget_update', (data) => {
      dispatch({ type: actions.UPDATE_BUDGET, payload: data });
    });
    
    socket.on('vault_update', () => {
      // Refetch keys
      fetchKeys();
    });
  }, [socket]);
  
  useEffect(() => {
    dispatch({ type: actions.SET_WEBSOCKET_STATUS, payload: connected });
  }, [connected]);
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
```

---

## Critical Implementation Details

### **1. Tangible Outputs Calculation**

```javascript
// Backend: GET /api/stats/tangible
function calculateTangibleOutputs(apiCalls) {
  const outputs = {
    images: { count: 0, cost_inr: 0 },
    llm_calls: { count: 0, cost_inr: 0 },
    audio_minutes: { count: 0, cost_inr: 0 }
  };
  
  apiCalls.forEach(call => {
    // Images: DALL-E endpoints
    if (call.endpoint.includes('/images') || call.model.includes('dall-e')) {
      outputs.images.count += 1;
      outputs.images.cost_inr += call.cost_inr;
    }
    
    // LLM calls: chat/messages endpoints
    if (call.endpoint.includes('/chat') || call.endpoint.includes('/messages')) {
      outputs.llm_calls.count += 1;
      outputs.llm_calls.cost_inr += call.cost_inr;
    }
    
    // Audio: Whisper, TTS
    if (call.endpoint.includes('/audio') || 
        call.model.includes('whisper') || 
        call.model.includes('tts')) {
      // Count each audio call as 1 minute (approximation)
      // Actual duration may vary; refine in Session 3 with model metadata
      outputs.audio_minutes.count += 1;
      outputs.audio_minutes.cost_inr += call.cost_inr;
    }
  });
  
  return outputs;
}
```

### **2. Project Auto-Detection**

```javascript
// Backend: When logging API call
async function logApiCall(callData) {
  // Extract project from header or detect from cwd
  const projectPath = callData.project || process.cwd();
  const projectName = path.basename(projectPath);
  
  // Upsert project
  let project = await db.getProjectByPath(projectPath);
  if (!project) {
    project = await db.addProject({
      name: projectName,
      directory_path: projectPath
    });
  }
  
  // Update project total_cost
  await db.run(`
    UPDATE projects 
    SET total_cost = total_cost + ? 
    WHERE id = ?
  `, [callData.cost_inr, project.id]);
  
  // Log call
  await db.logApiCall({ ...callData, project: projectName });
}
```

### **3. Number Formatting (Indian Numbering)**

```javascript
// src/dashboard/src/services/formatters.js
export function formatINR(amount, options = {}) {
  const { compact = false } = options;
  
  // Compact: ₹1.2K, ₹1.2L, ₹1.2Cr
  if (compact && amount >= 1000) {
    if (amount >= 10000000) { // 1 crore
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    }
    if (amount >= 100000) { // 1 lakh
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  
  // Full: ₹1,24,700
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function formatRelativeTime(timestamp) {
  const diff = Date.now() - new Date(timestamp);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-IN');
}
```

### **4. Loading States (Skeleton Screens)**

```jsx
// Stat Card Skeleton
<div className="animate-pulse">
  <div className="h-4 bg-bg-hover rounded w-20 mb-2"></div>
  <div className="h-8 bg-bg-hover rounded w-32"></div>
</div>

// Activity Item Skeleton
<div className="animate-pulse flex gap-3">
  <div className="h-10 w-10 bg-bg-hover rounded"></div>
  <div className="flex-1 space-y-2">
    <div className="h-4 bg-bg-hover rounded w-3/4"></div>
    <div className="h-3 bg-bg-hover rounded w-1/2"></div>
  </div>
</div>

// Chart Skeleton
<div className="animate-pulse h-64 bg-bg-hover rounded"></div>
```

### **5. Error Handling Strategy**

**Three Levels:**

1. **API Call Errors** - Show error state in component
```jsx
try {
  const data = await api.get('/api/stats');
  setStats(data);
} catch (error) {
  setError('Failed to load stats. Please try again.');
}
```

2. **WebSocket Disconnection** - Show reconnection banner
```javascript
socket.on('disconnect', () => {
  // Show banner: "Live updates disconnected. Reconnecting..."
});

socket.on('connect', () => {
  // Hide banner
});
```

3. **Backend Down** - Show full-page error state
```jsx
<div className="flex flex-col items-center justify-center h-screen">
  <AlertTriangle className="w-16 h-16 text-warning mb-4" />
  <h2 className="text-2xl mb-2">Cannot connect to ToastyKey</h2>
  <p className="text-secondary mb-6">
    Make sure the proxy server is running on port 4000
  </p>
  <Button onClick={retry}>Retry Connection</Button>
</div>
```
- Use Lucide React `AlertTriangle` icon

### **6. Toast Notification System**

```jsx
// ToastContext.jsx
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  
  const showToast = ({ type, message, duration = 3000 }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Usage
const { showToast } = useToast();
showToast({ type: 'success', message: 'API key added successfully' });
```

### **7. Production Build Setup**

```javascript
// src/index.js (enhanced)
const path = require('path');

function setupDashboard(app) {
  if (process.env.NODE_ENV === 'production') {
    const dashboardPath = path.join(__dirname, 'dashboard', 'dist');
    
    // Serve static files
    app.use(express.static(dashboardPath));
    
    // SPA fallback
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(dashboardPath, 'index.html'));
      }
    });
  }
}
```

**Build Commands:**
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dashboard:dev": "cd src/dashboard && npm run dev",
    "dashboard:build": "cd src/dashboard && npm run build",
    "dashboard:install": "cd src/dashboard && npm install",
    "dev": "concurrently \"npm start\" \"npm run dashboard:dev\"",
    "build": "npm run dashboard:build",
    "start:prod": "NODE_ENV=production npm start"
  }
}
```

---

## Dependencies

### **Root package.json (additions)**

```json
{
  "dependencies": {
    "socket.io": "^4.7.4"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### **Dashboard package.json (new)**

```json
{
  "name": "toastykey-dashboard",
  "version": "0.2.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.0",
    "socket.io-client": "^4.7.4",
    "recharts": "^2.12.0",
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.4",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35"
  }
}
```

---

## Charts & Data Visualization (UI/UX Pro Max)

### **Spend Chart (Overview) - Area Chart**
- **Type**: Trend Over Time → Area Chart
- **Library**: Recharts
- **Data**: Last 30 days of daily spend
- **Color**: Primary #3B82F6 with 20% opacity fill
- **Interactive**: 
  - Hover tooltip showing date + amount + provider breakdown
  - Toggle button: USD / INR
- **Accessibility**: Provide data table fallback
- **Performance**: <1000 points use SVG, ≥1000 use Canvas

### **Provider Breakdown - Horizontal Bar Chart**
- **Type**: Compare Categories → Horizontal Bar Chart
- **Colors**: OpenAI #22C55E, Anthropic #F59E0B
- **Sort**: Descending by spend
- **Accessibility**: Value labels on each bar
- **Interactive**: Hover shows exact amount, click to filter activity feed

### **Budget Progress - Linear Progress Bar**
- **Color Logic**:
  - <60%: `--success` (#22C55E)
  - 60-80%: `--warning` (#F59E0B)
  - 80%+: `--error` (#EF4444)
- **Animation**: Smooth width transition (300ms ease-out)
- **Label**: Shows current/limit amounts + percentage

### **Project Detail Charts**
- **Pie Chart**: Cost by provider (max 5 providers, use bar if more)
- **Line Chart**: Cost over time for this project (last 30 days)

---

## Accessibility & Best Practices

### **Checklist (UI/UX Pro Max Standards)**

**Visual Quality:**
- ✅ No emojis as icons (use Lucide React SVG icons)
- ✅ All icons from consistent icon family (Lucide)
- ✅ Semantic theme tokens used consistently
- ✅ Pressed-state visuals don't shift layout

**Interaction:**
- ✅ All clickable elements have cursor-pointer
- ✅ Hover states with 150-300ms transitions
- ✅ Touch targets ≥44×44px
- ✅ Disabled states visually clear
- ✅ Keyboard navigation works (Tab order matches visual)

**Light/Dark Mode:**
- ✅ Primary text contrast ≥4.5:1 (WCAG AA)
- ✅ Secondary text contrast ≥3:1
- ✅ Dark mode only (as specified)

**Layout:**
- ✅ Responsive: 375px, 768px, 1024px, 1440px
- ✅ 8px spacing rhythm maintained
- ✅ No horizontal scroll on mobile
- ✅ Safe-area compliant (for mobile)

**Accessibility:**
- ✅ All interactive elements have aria-labels
- ✅ Focus states visible (2-4px outline)
- ✅ Screen reader support (aria-live for updates)
- ✅ Keyboard shortcuts don't conflict with system
- ✅ prefers-reduced-motion respected

---

## Empty States

**No API Calls Yet:**
```
┌─────────────────────────────────┐
│         [Radio Icon]            │
│    No API calls yet             │
│    Start by adding a key        │
│                                 │
│    [+ Add API Key]              │
└─────────────────────────────────┘
```
- Use Lucide React `Radio` icon

**No Projects:**
```
┌─────────────────────────────────┐
│         [Folder Icon]           │
│    No projects detected         │
│    Make your first API call to  │
│    automatically track projects │
└─────────────────────────────────┘
```
- Use Lucide React `Folder` icon

**No Keys:**
```
┌─────────────────────────────────┐
│         [Key Icon]              │
│    No API keys stored           │
│    Add a key to start tracking  │
│                                 │
│    [+ Add Key] [Import .env]    │
└─────────────────────────────────┘
```
- Use Lucide React `Key` icon

---

## Success Criteria

### **Functional Requirements**

1. ✅ Dashboard serves on localhost:3000 (dev) or integrated on 3000 (prod)
2. ✅ Real-time updates via WebSocket (new API calls appear instantly)
3. ✅ 5 views: Overview, Projects, Key Vault, Triggers (placeholder), Reports (placeholder)
4. ✅ Setup wizard triggers on first launch (no keys + no API calls)
5. ✅ All REST API endpoints implemented and tested
6. ✅ Sidebar navigation with collapse/expand
7. ✅ Currency toggle (INR/USD)
8. ✅ Responsive design (mobile, tablet, desktop)

### **Design Quality**

1. ✅ Premium dev tool aesthetic (Vercel dashboard quality)
2. ✅ Dark mode only with professional color palette
3. ✅ Fira Code/Sans typography pairing
4. ✅ Smooth animations (150-300ms, respects reduced-motion)
5. ✅ Skeleton screens for loading states
6. ✅ Indian numbering format for INR (₹1,24,700)
7. ✅ Relative times (2m ago, 1h ago, yesterday)
8. ✅ No emojis as icons (Lucide React)

### **Technical Requirements**

1. ✅ React 18 with Vite
2. ✅ Tailwind CSS for styling
3. ✅ React Router for navigation
4. ✅ Socket.io for WebSocket
5. ✅ Recharts for data visualization
6. ✅ Context + useReducer for state management
7. ✅ Hybrid deployment (dev: separate, prod: integrated)
8. ✅ Error handling at three levels (component, WebSocket, backend down)

### **Performance**

1. ✅ Initial load <2s
2. ✅ WebSocket reconnection automatic
3. ✅ Charts optimize rendering (<1000 pts SVG, >1000 Canvas)
4. ✅ Activity feed limited to 20 items
5. ✅ Skeleton screens show <300ms

---

## Out of Scope (Session 3)

- Anomaly detection engine
- Trigger actions (email/Slack alerts)
- Report generation
- Additional providers (ElevenLabs, Cartesia, Replicate, Stability)
- Export data (CSV, PDF)
- Multi-user support
- Authentication/login

---

## Appendix: UI/UX Pro Max Recommendations Summary

**Product Type:** Developer Tool / IDE  
**Style:** Dark Mode (OLED)  
**Colors:** Blue primary (#2563EB, #3B82F6), Green accent (#22C55E), Amber warnings (#F59E0B)  
**Typography:** Fira Code (data) + Fira Sans (body)  
**Charts:** Area (trends), Horizontal Bar (comparison), Progress Bar (budgets)  
**Animation:** 150-300ms, transform/opacity only, respect reduced-motion  
**Accessibility:** WCAG AAA, keyboard nav, screen reader support  

**Anti-Patterns to Avoid:**
- Slow updates + No automation
- Emojis as structural icons
- Hover-only interactions
- Animations >500ms
- Layout shifts during animation
- Color-only information conveyance

---

**End of Specification**
