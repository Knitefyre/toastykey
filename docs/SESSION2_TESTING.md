# ToastyKey Session 2 - Testing Guide

## Overview

This guide covers end-to-end testing for the Session 2 React dashboard with real-time WebSocket updates.

## Prerequisites

- Node.js installed
- ToastyKey Session 1 complete (backend running)
- At least one API key added to vault

## Test 1: Development Workflow

### Start Both Servers

```bash
cd /Users/bakatoast/Toasty\ OS/toastykey
npm run dev
```

This starts:
- Backend proxy on http://localhost:4000
- Frontend dashboard on http://localhost:3000

### Expected Output

```
Proxy + WebSocket running on http://localhost:4000

VITE v5.x ready in Xms
➜  Local:   http://localhost:3000/
```

### Verify Dashboard Loads

1. Open http://localhost:3000
2. Expected: Setup wizard OR dashboard (depending on setup status)
3. Check browser console for errors (should be none)

## Test 2: Setup Wizard Flow

### Trigger Wizard

If you have API keys already, delete them or test on fresh database:

```bash
rm toastykey.db
npm start  # Restart to recreate DB
```

### Test Steps

1. **Welcome Screen**
   - [ ] See ToastyKey logo and branding
   - [ ] See feature list with checkmarks
   - [ ] "Get Started" button works

2. **Key Import Step**
   - [ ] Can switch between Manual and Import modes
   - [ ] Manual mode: Add OpenAI key (provider dropdown, label, key input)
   - [ ] Manual mode: Add Anthropic key
   - [ ] Import mode: Paste .env content and import
   - [ ] Counter shows "X API key(s) added"
   - [ ] "Skip for now" button works
   - [ ] "Continue" button appears after adding keys

3. **Budget Step**
   - [ ] Can select period (Daily/Weekly/Monthly)
   - [ ] Can switch currency (INR/USD)
   - [ ] Can enter amount
   - [ ] "Skip for now" works
   - [ ] "Set Budget" creates budget successfully

4. **MCP Config Step**
   - [ ] See config path displayed
   - [ ] See JSON config snippet
   - [ ] "Copy" button copies to clipboard
   - [ ] "Finish Setup" completes wizard and shows dashboard

## Test 3: Dashboard Navigation

### Sidebar Navigation

1. **Sidebar Behavior**
   - [ ] Desktop: Sidebar fixed on left
   - [ ] Mobile (<768px): Sidebar overlays, closes on navigation
   - [ ] Collapse/expand toggle works
   - [ ] State persists in localStorage

2. **Navigation Links**
   - [ ] Overview → /
   - [ ] Projects → /projects
   - [ ] Key Vault → /vault
   - [ ] Triggers → /triggers (placeholder)
   - [ ] Reports → /reports (placeholder)
   - [ ] Active state highlighting works

3. **Header**
   - [ ] WebSocket status: Green "Live" when connected, Red "Offline" when disconnected
   - [ ] Currency toggle: INR ↔ USD works
   - [ ] Currency toggle updates all cost displays

## Test 4: Overview View

### Stat Cards

1. **Load Overview**
   - Navigate to http://localhost:3000/
   - [ ] 4 stat cards visible
   - [ ] "Today's Spend" shows amount with optional delta
   - [ ] "This Month" shows amount
   - [ ] "API Calls" shows count
   - [ ] "Active Projects" shows count

2. **Budget Progress**
   - [ ] If budget set: Progress bar shows with correct color
     - Green <60%
     - Amber 60-80%
     - Red 80%+
   - [ ] Current/Limit labels show correct amounts
   - [ ] Warning message appears at 80%+

### Charts

1. **Spend Chart**
   - [ ] Area chart displays 30 days of data
   - [ ] Gradient fill (green)
   - [ ] Tooltip shows on hover
   - [ ] Respects currency toggle (INR/USD)

2. **Provider Breakdown**
   - [ ] Horizontal bar chart displays providers
   - [ ] OpenAI = green, Anthropic = amber
   - [ ] Sorted descending by spend
   - [ ] Percentage labels show
   - [ ] Legend below chart shows provider colors

3. **Tangible Outputs**
   - [ ] 3 cards: Images, LLM Calls, Audio Minutes
   - [ ] Icons display correctly (Image, MessageSquare, Music)
   - [ ] Counts and costs show for each type

4. **Activity Feed**
   - [ ] Recent API calls display in list
   - [ ] Each item shows: status icon, provider badge, model, cost, latency, timestamp
   - [ ] "Load More" button appears and works
   - [ ] Empty state shows if no calls: "No API calls yet"

## Test 5: Projects View

### Projects Grid

1. **Navigate to /projects**
   - [ ] Grid of project cards displays
   - [ ] Each card shows: name, call count badge, total cost, this month cost, last active
   - [ ] Cards are clickable

2. **Empty State**
   - [ ] If no projects: Shows folder icon + message "No projects yet"

3. **Project Detail**
   - [ ] Click project card → navigates to /projects/:id
   - [ ] Back button returns to projects list
   - [ ] Project name and path displayed
   - [ ] 3 stat cards: Total Cost, API Calls, Sessions
   - [ ] Provider breakdown chart
   - [ ] Recent activity feed

## Test 6: Key Vault View

### Key Table

1. **Navigate to /vault**
   - [ ] Table shows all API keys
   - [ ] Columns: Provider, Label, Key (masked), Status, Last Used, Calls, Cost, Actions
   - [ ] Keys are masked by default (sk-proj...a1b2)

2. **Actions**
   - [ ] Reveal button: Shows full key for 10 seconds, then auto-masks
   - [ ] Copy button appears when revealed
   - [ ] Delete button: Prompts for confirmation, deletes key
   - [ ] Toast notifications appear for all actions

3. **Add Key Modal**
   - [ ] "Add Key" button opens modal
   - [ ] Provider dropdown (OpenAI, Anthropic, Custom)
   - [ ] Label input field
   - [ ] API Key input with show/hide toggle
   - [ ] Form validation: required fields, sk- prefix check
   - [ ] "Add Key" button creates key and refreshes table
   - [ ] "Cancel" closes modal without action

4. **Empty State**
   - [ ] If no keys: Shows key icon + "Add Key" button

## Test 7: Real-time WebSocket Updates

### Setup

1. Start backend: `npm start`
2. Start dashboard: `cd src/dashboard && npm run dev`
3. Open dashboard in browser (http://localhost:3000)

### Test WebSocket Connection

1. **Connection Status**
   - [ ] Header shows green dot + "Live"
   - [ ] If you stop backend: Header shows red dot + "Offline"
   - [ ] Restart backend: Reconnects automatically

2. **Real-time Activity Feed**
   - [ ] Keep Overview page open
   - [ ] Make test API call through proxy:
     ```bash
     curl -X POST http://localhost:4000/openai/v1/chat/completions \
       -H "Content-Type: application/json" \
       -d '{
         "model": "gpt-4",
         "messages": [{"role": "user", "content": "Hello"}]
       }'
     ```
   - [ ] New activity appears in feed immediately (no page refresh)
   - [ ] Activity item shows correct provider, model, cost, timestamp
   - [ ] Slide-in animation plays

3. **Stats Update**
   - [ ] Stat cards update after API call (may require manual refresh for now)

## Test 8: Production Mode

### Build Dashboard

```bash
cd src/dashboard
npm run build
cd ../..
```

Expected: `src/dashboard/dist` directory created

### Start in Production

```bash
NODE_ENV=production npm start
```

### Verify

1. **Open http://localhost:4000** (note: port 4000, not 3000)
   - [ ] Dashboard loads from Express (not Vite)
   - [ ] All routes work (Overview, Projects, Vault)
   - [ ] API calls work
   - [ ] WebSocket connection works
   - [ ] No Vite dev server running

2. **SPA Routing**
   - [ ] Navigate to /projects
   - [ ] Refresh page → still shows Projects view (no 404)
   - [ ] Direct URL access works (http://localhost:4000/vault)

## Test 9: Toast Notifications

### Test All Toast Types

1. **Success**
   - Add API key → "API key added successfully"
   - Set budget → "Budget set successfully"
   - Copy key → "Copied to clipboard"

2. **Error**
   - Try to add invalid key → "Please enter a valid API key"
   - API failure → error message displays

3. **Info**
   - Reveal key → "Key revealed for 10 seconds"

4. **Toast Behavior**
   - [ ] Appears in top-right corner
   - [ ] Auto-dismisses after 3-5 seconds
   - [ ] Has close button
   - [ ] Multiple toasts stack vertically
   - [ ] Icon matches type (CheckCircle, XCircle, AlertTriangle, Info)

## Test 10: Responsive Design

### Desktop (≥768px)

- [ ] Sidebar fixed on left
- [ ] All views display correctly
- [ ] Charts responsive to window width

### Mobile (<768px)

- [ ] Sidebar overlays on left
- [ ] Sidebar closes after navigation
- [ ] Stat cards stack vertically
- [ ] Charts scale down
- [ ] Tables scroll horizontally if needed

## Known Issues / Limitations

1. **Budget checking**: Backend checks budgets but doesn't enforce (Session 3)
2. **Session tracking**: Manual session IDs only (Session 3)
3. **Chart size warning**: Bundle >500KB (acceptable for MVP)
4. **Setup detection**: Checks "no keys AND no calls" (simple logic)

## Success Criteria

All tests above should pass with:
- ✅ No console errors
- ✅ All navigation works
- ✅ WebSocket connection stable
- ✅ Real-time updates appear
- ✅ All CRUD operations work
- ✅ Production mode serves dashboard correctly

---

**Session 2 Status: READY FOR TESTING**

Report any issues found during testing for investigation.
