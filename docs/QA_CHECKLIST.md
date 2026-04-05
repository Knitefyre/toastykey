# Session 2.5: Full QA Checklist

## Backend API QA

### Stats API (`/api/stats/*`)

- [ ] `GET /api/stats` - Returns overview stats
- [ ] `GET /api/stats/daily?days=30` - Returns daily spend data
- [ ] `GET /api/stats/providers` - Returns provider breakdown
- [ ] `GET /api/stats/tangible` - Returns tangible outputs (images, calls, audio)
- [ ] `GET /api/stats/calls?limit=20` - Returns recent API calls

### Projects API (`/api/projects/*`)

- [ ] `GET /api/projects` - Returns all projects with stats
- [ ] `GET /api/projects/:id` - Returns single project detail

### Vault API (`/api/vault/*`)

- [ ] `GET /api/vault/keys` - Returns all keys (metadata only, encrypted)
- [ ] `POST /api/vault/keys` - Adds a new key
- [ ] `DELETE /api/vault/keys/:id` - Deletes a key
- [ ] `POST /api/vault/keys/:id/reveal` - Reveals key (decrypted)
- [ ] `POST /api/vault/import-env` - Imports keys from .env content

### Budgets API (`/api/budgets/*`)

- [ ] `GET /api/budgets` - Returns all budgets with current spend
- [ ] `POST /api/budgets` - Creates/updates a budget

### Setup API (`/api/setup/*`)

- [ ] `GET /api/setup/status` - Returns setup status
- [ ] `POST /api/setup/scan` - Scans directories for .env files

### Health Check

- [ ] `GET /api/health` - Returns service health status

## Frontend Component QA

### Dashboard Overview (`/`)

**Stat Cards:**
- [ ] Today's Spend shows correct amount
- [ ] This Month shows correct amount
- [ ] API Calls shows correct count
- [ ] Active Projects shows correct count
- [ ] Delta indicators show (if applicable)
- [ ] Loading states show skeleton screens

**Budget Progress:**
- [ ] Shows when budget is set
- [ ] Progress bar shows correct percentage
- [ ] Color changes: green < 60%, amber 60-80%, red 80%+
- [ ] Warning message appears at 80%+
- [ ] Current/Limit labels show correct amounts

**Spend Chart:**
- [ ] Area chart displays 30 days of data
- [ ] Gradient fill shows correctly
- [ ] Tooltip shows on hover
- [ ] Respects currency toggle (INR/USD)
- [ ] Empty state shows when no data

**Provider Breakdown:**
- [ ] Horizontal bar chart displays providers
- [ ] OpenAI shows green, Anthropic shows amber
- [ ] Bars are sorted by spend (descending)
- [ ] Percentage labels show
- [ ] Legend shows provider colors
- [ ] Empty state shows when no data

**Tangible Outputs:**
- [ ] 3 cards show: Images, LLM Calls, Audio Minutes
- [ ] Icons display correctly
- [ ] Counts and costs show for each type
- [ ] Empty state shows when no data

**Activity Feed:**
- [ ] Recent API calls display in list
- [ ] Each item shows: status icon, provider badge, model, cost, latency, timestamp
- [ ] "Load More" button appears and works
- [ ] Empty state shows: "No API calls yet"
- [ ] Real-time updates work (new calls appear immediately)

### Projects View (`/projects`)

**Projects Grid:**
- [ ] Grid of project cards displays
- [ ] Each card shows: name, call count badge, total cost, this month cost, last active
- [ ] Cards are clickable
- [ ] Empty state shows: "No projects yet"

**Project Detail (`/projects/:id`):**
- [ ] Back button returns to projects list
- [ ] Project name and path displayed
- [ ] 3 stat cards show: Total Cost, API Calls, Sessions
- [ ] Provider breakdown chart shows
- [ ] Recent activity feed shows
- [ ] Empty state shows when no project data

### Key Vault View (`/vault`)

**Key Table:**
- [ ] Table shows all API keys
- [ ] Columns: Provider, Label, Key (masked), Status, Last Used, Calls, Cost, Actions
- [ ] Keys are masked by default (sk-proj...a1b2)
- [ ] Empty state shows with "Add Key" button

**Key Actions:**
- [ ] Reveal button shows full key for 10 seconds
- [ ] Copy button appears when revealed
- [ ] Key auto-masks after 10 seconds
- [ ] Delete button prompts for confirmation
- [ ] Delete removes key and refreshes table
- [ ] Toast notifications appear for all actions

**Add Key Modal:**
- [ ] "Add Key" button opens modal
- [ ] Provider dropdown: OpenAI, Anthropic, Custom
- [ ] Label input field works
- [ ] API Key input with show/hide toggle
- [ ] Form validation: required fields
- [ ] Form validation: sk- prefix check
- [ ] "Add Key" creates key and refreshes table
- [ ] "Cancel" closes modal without action
- [ ] Toast shows success/error messages

### Setup Wizard

**Step 1 - Welcome:**
- [ ] ToastyKey logo displays
- [ ] Feature list with checkmarks
- [ ] "Get Started" button works

**Step 2 - Key Import:**
- [ ] Mode toggle works (Manual ↔ Import)
- [ ] Manual mode: provider dropdown, label input, key input
- [ ] Manual mode: "Add Key" adds key and shows count
- [ ] Import mode: textarea accepts .env content
- [ ] Import mode: "Import Keys" parses and adds keys
- [ ] Counter shows "X API key(s) added"
- [ ] "Skip for now" button advances to next step
- [ ] "Continue" button appears after adding keys

**Step 3 - Budget:**
- [ ] Period selector works (Daily/Weekly/Monthly)
- [ ] Currency toggle works (INR/USD)
- [ ] Amount input accepts numbers
- [ ] "Skip for now" advances to next step
- [ ] "Set Budget" creates budget and advances

**Step 4 - MCP Config:**
- [ ] Config path displays correctly
- [ ] JSON config snippet shows
- [ ] "Copy" button copies to clipboard
- [ ] Toast shows "Copied to clipboard"
- [ ] "Finish Setup" completes wizard
- [ ] **CRITICAL**: Dashboard appears after clicking "Finish Setup"

### Triggers View (`/triggers`)

- [ ] Placeholder page loads
- [ ] Shows "Coming Soon" message
- [ ] Shows planned features list

### Reports View (`/reports`)

- [ ] Placeholder page loads
- [ ] Shows "Coming Soon" message
- [ ] Shows planned features list

### Layout Components

**Sidebar:**
- [ ] Fixed on left (desktop)
- [ ] Overlays on left (mobile)
- [ ] Collapse/expand toggle works
- [ ] State persists in localStorage
- [ ] Navigation links work
- [ ] Active state highlights current page
- [ ] Icons display correctly

**Header:**
- [ ] WebSocket status shows: Green "Live" when connected
- [ ] WebSocket status shows: Red "Offline" when disconnected
- [ ] Currency toggle works (INR ↔ USD)
- [ ] Currency toggle updates all cost displays

### Toast Notifications

**Types:**
- [ ] Success toasts show (green with checkmark)
- [ ] Error toasts show (red with X)
- [ ] Warning toasts show (amber with triangle)
- [ ] Info toasts show (blue with info icon)

**Behavior:**
- [ ] Toasts appear in top-right corner
- [ ] Auto-dismiss after 3-5 seconds
- [ ] Close button works
- [ ] Multiple toasts stack vertically

### Responsive Design

**Desktop (≥768px):**
- [ ] Sidebar fixed on left
- [ ] All views display correctly
- [ ] Charts are full width
- [ ] Tables are readable

**Mobile (<768px):**
- [ ] Sidebar overlays on left
- [ ] Sidebar closes after navigation
- [ ] Stat cards stack vertically
- [ ] Charts scale down
- [ ] Tables scroll horizontally if needed

## Visual Quality Check

### Dark Theme Consistency

- [ ] Background: #0F172A (primary), #1B2336 (surface), #272F42 (hover)
- [ ] Text: #F8FAFC (primary), #94A3B8 (secondary), #64748B (muted)
- [ ] Status colors consistent: green (success), amber (warning), red (error), blue (info)
- [ ] Provider colors: green (OpenAI), amber (Anthropic)
- [ ] Border color: #475569

### Typography

- [ ] Headings use monospace (Fira Code)
- [ ] Data values use monospace
- [ ] Body text uses sans-serif (Fira Sans)
- [ ] Font weights are correct (300, 400, 500, 600, 700)

### Number Formatting

- [ ] Currency shows: ₹1,247 (not ₹1247)
- [ ] Lakhs/Crores show for INR: ₹1.5L, ₹2.3Cr
- [ ] USD shows: $12.47 (not $12.4700000)
- [ ] Percentages show: 42% (not 0.42)
- [ ] Large numbers have commas: 1,234,567

### Relative Times

- [ ] Show relative: "2m ago", "5h ago", "3d ago"
- [ ] Not timestamps: "2024-04-04 10:30:00"

### Empty States

- [ ] Have descriptive text
- [ ] Have relevant icon
- [ ] Have CTA button (if applicable)
- [ ] Look intentional (not broken)

### Loading States

- [ ] Use skeleton screens (not spinners)
- [ ] Pulse animation plays
- [ ] Shapes match final content

## Production Mode QA

### Build

- [ ] `npm run dashboard:build` completes successfully
- [ ] No build errors
- [ ] Bundle size warning is acceptable (~650 KB)

### Production Server

- [ ] `NODE_ENV=production npm start` works
- [ ] Dashboard accessible at http://localhost:4000
- [ ] All routes work (/, /projects, /vault, etc.)
- [ ] API calls work
- [ ] WebSocket connection works
- [ ] SPA routing works (direct URL access)
- [ ] Page refresh doesn't 404

## Development Mode QA

### npm run dev

- [ ] Single command starts both servers
- [ ] Backend starts on port 4000
- [ ] Frontend starts on port 3000
- [ ] Both servers stay running
- [ ] Hot reload works (frontend)
- [ ] Backend logs show in same terminal
- [ ] Ctrl+C stops both servers

## WebSocket Real-time Updates

### Connection

- [ ] Header shows "Live" when connected
- [ ] Header shows "Offline" when backend stops
- [ ] Auto-reconnects when backend restarts

### Events

- [ ] `api_call` events update activity feed
- [ ] New calls appear immediately (no refresh needed)
- [ ] Slide-in animation plays for new items
- [ ] Stats update after API call

## API Integration Tests

### Create Test Key

```bash
curl -X POST http://localhost:4000/api/vault/keys \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","label":"test","key":"sk-test123456789"}'
```

- [ ] Returns success
- [ ] Key appears in vault

### Make Test API Call

```bash
curl -X POST http://localhost:4000/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}'
```

- [ ] Call is logged
- [ ] Activity feed updates
- [ ] Stats update

### Set Budget

```bash
curl -X POST http://localhost:4000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{"scope":"global","period":"month","limit":5000,"currency":"USD"}'
```

- [ ] Budget created
- [ ] Progress bar appears on Overview

## Known Acceptable Issues

- [ ] Bundle size > 500KB (expected for MVP)
- [ ] Budget enforcement doesn't block requests (Session 3 feature)
- [ ] No authentication (local-only, Session 3 feature)

## Bugs Found

List any bugs found during QA:

1. 
2. 
3. 

## QA Status

- [ ] All critical features tested
- [ ] All views load correctly
- [ ] All user flows work end-to-end
- [ ] No console errors
- [ ] Visual quality approved
- [ ] Ready for user testing
