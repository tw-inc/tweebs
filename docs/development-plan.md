# TWEEBS Development Plan

Self-contained build plan for TWEEBS V1. Read this document plus the specs in `docs/` and `blueprints/` to build the entire app. No prior context needed.

---

## 1. Pre-Flight Checklist

Everything that must exist before a single line of application code is written.

### 1.1 Scaffold the electron-vite Project

```bash
# From the tweebs repo root
npm create @electron-vite/create@latest . -- --template react-ts

# If the above prompts about existing files, say yes to overwrite.
# This creates: electron.vite.config.ts, src/main/, src/renderer/, src/preload/, package.json, tsconfig*.json
```

If `npm create @electron-vite/create` doesn't support `.` (current dir) with existing files, scaffold into a temp dir and move:

```bash
cd /tmp
npm create @electron-vite/create@latest tweebs-scaffold -- --template react-ts
# Then copy src/, electron.vite.config.ts, tsconfig*.json into /Users/wadamomo/dev/tweebs/
# Merge package.json dependencies
```

After scaffolding, verify the directory structure matches:

```
tweebs/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── src/
│   ├── main/
│   │   └── index.ts
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── ...
│   └── preload/
│       └── index.ts
```

### 1.2 Install Dependencies

```bash
# Core Electron + React (most come from electron-vite scaffold)
npm install electron electron-vite react react-dom
npm install -D @types/react @types/react-dom typescript

# State management
npm install zustand

# Database (native module for Electron main process)
npm install better-sqlite3
npm install -D @types/better-sqlite3

# Utility
npm install nanoid         # ID generation for tickets, tweebs, messages
npm install slugify        # Project name -> directory slug

# Dev
npm install -D vitest @testing-library/react
```

Version-critical packages (pin these):
- `electron`: ^33.x (latest stable at time of writing)
- `better-sqlite3`: ^11.x (must be compatible with the Electron version's Node ABI)
- `electron-vite`: ^3.x

Note: `better-sqlite3` is a native module. It must be rebuilt for Electron's Node version. electron-vite handles this via `electron-builder`'s native dependency support, but verify with `npm run dev` that the DB initializes without a native module error. If it fails, run:

```bash
npx electron-rebuild -f -w better-sqlite3
```

### 1.3 TypeScript Configuration

`tsconfig.json` (root, extends from electron-vite scaffold):
- `strict: true`
- Path aliases for shared types:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "@shared/*": ["./src/shared/*"]
      }
    }
  }
  ```

Ensure the electron-vite config maps these paths for both main and renderer builds.

### 1.4 electron-vite Config

`electron.vite.config.ts` must handle three build targets. The scaffold provides a starting point. Verify and adjust:

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  }
})
```

Key: `externalizeDepsPlugin()` keeps native modules like `better-sqlite3` out of the Vite bundle (they must load as Node requires).

### 1.5 Dev Scripts

In `package.json`:

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

`npm run dev` should launch the Electron window with HMR on the renderer. Verify this works with the bare scaffold before writing any application code.

### 1.6 Chrome DevTools MCP for the TWEEBS Dev Loop

Create `.mcp.json` in the TWEEBS repo root (not in a user project -- this is for developing TWEEBS itself):

```json
{
  "mcpServers": {
    "electron-devtools": {
      "command": "npx",
      "args": ["@anthropic-ai/electron-mcp-server"],
      "transport": "stdio"
    }
  }
}
```

This lets Claude Code inspect the TWEEBS Electron renderer's DOM/CSS during development. See Section 5 for full setup details.

### 1.7 Create Directory Structure

Create the full source tree as defined in `docs/project-structure.md`. Directories only (no files yet -- those come phase by phase):

```bash
mkdir -p src/main/{agents,db,ipc,onboarding,blueprints,notifications}
mkdir -p src/renderer/{components/{Chat,Board,Onboarding,ProjectCreate,Settings},stores,styles}
mkdir -p src/shared
mkdir -p src/preload
mkdir -p prompts
mkdir -p scripts
```

### 1.8 Shared Types File

Create `src/shared/types.ts` with the core types referenced across main and renderer. This is the source of truth for the IPC contract:

```typescript
// === PM Command Protocol ===
export type PMCommand =
  | { cmd: 'create_ticket'; title: string; description: string; assignTo: string; dependsOn?: string[] }
  | { cmd: 'move_ticket'; ticketId: string; column: 'backlog' | 'in_progress' | 'done' }
  | { cmd: 'spawn_worker'; role: string; task: { title: string; description: string; acceptanceCriteria: string[] } }
  | { cmd: 'kill_worker'; tweebId: string }
  | { cmd: 'message_user'; content: string }
  | { cmd: 'request_decision'; question: string; options: string[] }
  | { cmd: 'mark_complete'; summary: string }

// === Agent Engine ===
export interface AgentConfig {
  workingDir: string
  systemPrompt: string
  model?: string
  sessionId?: string
}

export interface StreamMessage {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'system'
  content: string
  timestamp: number
}

// === Database Models ===
export interface Project {
  id: string
  name: string
  description: string | null
  blueprint_id: string | null
  project_path: string
  status: 'active' | 'paused' | 'completed' | 'archived'
  pm_session_id: string | null
  created_at: number
  updated_at: number
}

export interface Tweeb {
  id: string
  project_id: string
  role: string
  display_name: string
  avatar_color: string
  pid: number | null
  status: 'idle' | 'working' | 'blocked' | 'done' | 'rate_limited' | 'error'
  created_at: number
  updated_at: number
}

export interface Ticket {
  id: string
  project_id: string
  assigned_tweeb_id: string | null
  title: string
  description: string | null
  column_name: 'backlog' | 'in_progress' | 'done'
  priority: number
  created_at: number
  updated_at: number
}

export interface Message {
  id: string
  project_id: string
  role: 'user' | 'pm'
  content: string
  created_at: number
}

// === IPC Events (main -> renderer) ===
export type IPCEvent =
  | { type: 'chat:message'; message: Message }
  | { type: 'board:update'; tickets: Ticket[] }
  | { type: 'tweeb:status'; tweeb: Tweeb }
  | { type: 'project:status'; projectId: string; status: Project['status'] }
  | { type: 'decision:request'; question: string; options: string[] }

// === IPC Handlers (renderer -> main) ===
export interface IPCHandlers {
  'chat:send': (projectId: string, message: string) => Promise<void>
  'project:create': (name: string, description: string, blueprintId: string) => Promise<Project>
  'project:list': () => Promise<Project[]>
  'project:get': (id: string) => Promise<{ project: Project; tickets: Ticket[]; messages: Message[]; tweebs: Tweeb[] }>
  'onboard:check': () => Promise<{ step: string; details: Record<string, boolean> }>
  'onboard:install': (target: string) => Promise<{ success: boolean; error?: string }>
  'settings:get': (key: string) => Promise<string | null>
  'settings:set': (key: string, value: string) => Promise<void>
}
```

---

## 2. Build Phases

Eight phases, each independently testable.

---

### Phase 1: Electron Shell + SQLite + Blank Window

**Goal**: An Electron app launches, creates a SQLite database, and renders a React component.

**What gets built**:
- `src/main/index.ts` -- Electron app entry. Creates BrowserWindow, loads renderer.
- `src/main/db/schema.ts` -- SQL table definitions (projects, tweebs, tickets, messages, settings).
- `src/main/db/index.ts` -- DB singleton. Opens `~/Library/Application Support/tweebs/tweebs.db`. Runs schema migration. Exports query helpers.
- `src/preload/index.ts` -- contextBridge with `electronAPI` object exposing IPC invoke/on wrappers.
- `src/renderer/main.tsx` -- React root mount.
- `src/renderer/App.tsx` -- Minimal component that displays "TWEEBS" and the app version.
- `src/renderer/styles/global.css` -- Dark background, base typography, CSS reset.

**Files created**:
- `src/main/index.ts`
- `src/main/db/schema.ts`
- `src/main/db/index.ts`
- `src/preload/index.ts`
- `src/renderer/main.tsx`
- `src/renderer/App.tsx`
- `src/renderer/styles/global.css`
- `src/shared/types.ts` (from pre-flight)

**Verification**:
1. `npm run dev` launches an Electron window with a dark background and "TWEEBS" text.
2. Check `~/Library/Application Support/tweebs/tweebs.db` exists (open with `sqlite3` CLI, run `.tables`, see all five tables).
3. No console errors in the Electron DevTools (Cmd+Shift+I in dev mode).

**Unblocks**: Phase 2 (IPC and project CRUD require DB + window).

---

### Phase 2: IPC Bridge + Project CRUD + Navigation

**Goal**: The renderer can create and list projects via IPC. Basic routing between Home and Project views.

**What gets built**:
- `src/main/ipc/projects.ts` -- IPC handlers for `project:create`, `project:list`, `project:get`. Inserts/reads from SQLite.
- `src/main/ipc/index.ts` -- Registers all IPC handlers at app startup.
- `src/renderer/stores/projectStore.ts` -- Zustand store for projects list and active project.
- `src/renderer/stores/appStore.ts` -- Zustand store for app-level state (current view, onboarding status).
- `src/renderer/components/ProjectCreate/NewProjectView.tsx` -- "New Project" flow: name input, blueprint selection (hardcoded list of 4).
- `src/renderer/App.tsx` -- Update with simple view router (Home / Project / Onboarding / Settings).
- Home screen showing project list and "New Project" card.

**Files created/modified**:
- `src/main/ipc/projects.ts` (create)
- `src/main/ipc/index.ts` (create)
- `src/renderer/stores/projectStore.ts` (create)
- `src/renderer/stores/appStore.ts` (create)
- `src/renderer/components/ProjectCreate/NewProjectView.tsx` (create)
- `src/renderer/App.tsx` (modify -- add routing)
- `src/preload/index.ts` (modify -- expose project IPC methods)

**Verification**:
1. `npm run dev`. See Home screen with "New Project" card.
2. Click "New Project". See blueprint selection. Type a name, select "Personal Website", submit.
3. Project appears on Home screen.
4. Click the project card. Navigate to an empty Project view (placeholder).
5. Restart app. Project persists (SQLite).

**Unblocks**: Phase 3 (Chat needs a project context and IPC bridge).

---

### Phase 3: Chat UI + PM Chat Store (Mock Data)

**Goal**: A functional chat interface with the PM. No real CLI yet -- mock the PM responses to build and test the full UI flow.

**What gets built**:
- `src/renderer/components/Chat/ChatView.tsx` -- Chat panel: message list + input box.
- `src/renderer/components/Chat/MessageBubble.tsx` -- User and PM message bubbles. PM has avatar + role label.
- `src/renderer/components/Chat/ChatInput.tsx` -- Text input with send button. Enter to send.
- `src/renderer/stores/chatStore.ts` -- Zustand store for messages. Listens for IPC `chat:message` events.
- `src/main/ipc/agents.ts` -- Stub IPC handler for `chat:send`. For now: echoes back a mock PM response after 500ms delay. Stores messages in SQLite.
- Project view layout: left panel = chat, right panel = board placeholder.
- Decision prompt UI: special message type with option buttons.

**Files created/modified**:
- `src/renderer/components/Chat/ChatView.tsx` (create)
- `src/renderer/components/Chat/MessageBubble.tsx` (create)
- `src/renderer/components/Chat/ChatInput.tsx` (create)
- `src/renderer/stores/chatStore.ts` (create)
- `src/main/ipc/agents.ts` (create -- mock)
- `src/renderer/App.tsx` (modify -- project view layout)

**Verification**:
1. `npm run dev`. Navigate to a project.
2. See chat panel on left. Type "I want a photography portfolio". Hit Enter.
3. User message appears as a bubble on the right. Mock PM response appears on the left after a short delay.
4. Messages persist across navigation (go Home, come back -- messages still there).
5. If a message is a decision prompt (mock one), see option buttons. Click an option -- it sends as a user message.

**Unblocks**: Phase 4 (Kanban board is the other half of the project view).

---

### Phase 4: Kanban Board UI (Mock Data)

**Goal**: The kanban board renders with three columns and cards that can change state. Still driven by mock data -- no real agent output yet.

**What gets built**:
- `src/renderer/components/Board/BoardView.tsx` -- Three columns: Backlog, In Progress, Done.
- `src/renderer/components/Board/Column.tsx` -- Column header + card list.
- `src/renderer/components/Board/Card.tsx` -- Ticket card with title, Tweeb avatar color, role label, status line, state visuals (pulsing glow, checkmark, etc.).
- `src/renderer/stores/boardStore.ts` -- Zustand store for tickets. Listens for IPC `board:update` events.
- Card click opens a detail view overlay (activity log).
- Mock data: inject 4-5 tickets at project creation time via the IPC handler. Add a "simulate progress" dev button that moves cards through columns over time (for visual testing).

**Files created/modified**:
- `src/renderer/components/Board/BoardView.tsx` (create)
- `src/renderer/components/Board/Column.tsx` (create)
- `src/renderer/components/Board/Card.tsx` (create)
- `src/renderer/stores/boardStore.ts` (create)
- `src/main/ipc/projects.ts` (modify -- seed mock tickets on project create)
- `src/renderer/App.tsx` (modify -- add board panel to project view)

**Verification**:
1. `npm run dev`. Create a new project (or open existing one).
2. See Board panel on the right with Backlog column containing 4-5 cards.
3. Cards show title, colored avatar dot, role label, status text.
4. Click a card -- see detail overlay with activity log.
5. Press the dev-only "simulate" button. Watch a card slide from Backlog to In Progress (with pulsing glow), then to Done (with green checkmark). Animations are smooth.
6. Rate-limited card state: yellow pulse with timer text. Blocked card: orange warning icon.

**Unblocks**: Phase 5 (the board is ready to receive real data from the agent engine).

---

### Phase 5: Agent Engine (Claude Code CLI Wrapper)

**Goal**: Spawn a `claude -p` child process, stream its NDJSON output, parse text content. No PM command parsing yet -- just prove the CLI wrapper works.

**What gets built**:
- `src/main/agents/types.ts` -- AgentBackend, AgentProcess interfaces.
- `src/main/agents/claude.ts` -- Claude Code CLI wrapper. Spawns `claude -p` with `--output-format stream-json` and `--dangerously-skip-permissions`. Parses NDJSON line-by-line. Emits `StreamMessage` events. Handles process exit.
- `src/main/agents/manager.ts` -- TweebManager. Tracks active processes (Map of tweebId -> AgentProcess). Methods: `spawnPM()`, `spawnWorker()`, `send()`, `killAll()`.
- Update `src/main/ipc/agents.ts` -- Replace mock handler. `chat:send` now sends the user's message to a real PM CLI process. PM responses stream back via IPC to the chat store.

**Files created/modified**:
- `src/main/agents/types.ts` (create)
- `src/main/agents/claude.ts` (create)
- `src/main/agents/manager.ts` (create)
- `src/main/ipc/agents.ts` (modify -- real CLI)

**Verification**:
1. Ensure `claude` CLI is installed and authenticated (`claude auth status`).
2. `npm run dev`. Open a project. Type a message in Chat.
3. The PM CLI process spawns. You see real Claude responses streaming into the chat panel token by token (or message by message, depending on stream parse granularity).
4. Send a follow-up message. The conversation continues (verify `--resume` works, or fall back to accumulated history if it doesn't).
5. Check the main process console: NDJSON lines are being parsed, text content extracted.
6. Close the project / app. No orphaned `claude` processes (check `ps aux | grep claude`).

**Unblocks**: Phase 6 (command parsing builds on the working CLI stream).

---

### Phase 6: PM Command Protocol + Command Executor

**Goal**: The PM's structured JSON commands are parsed from the stream and executed. This is the core brain-to-hands pipeline.

**What gets built**:
- `src/main/agents/command-executor.ts` -- Parses PM's output for fenced JSON command blocks. Validates against PMCommand schema. Executes each command:
  - `create_ticket` -> insert into SQLite tickets table, push `board:update` via IPC
  - `move_ticket` -> update SQLite, push `board:update`
  - `spawn_worker` -> call TweebManager.spawnWorker()
  - `kill_worker` -> call TweebManager.kill()
  - `message_user` -> push to renderer via IPC `chat:message` (strip raw commands from visible chat)
  - `request_decision` -> push decision prompt to renderer
  - `mark_complete` -> update project status in SQLite
- `prompts/pm.md` -- The PM's runtime system prompt. Instructs the PM to emit structured JSON commands. Includes the command schema, personality guidelines, and coordination rules. This is the most critical prompt in the system.
- Update `src/main/agents/claude.ts` -- Add `onCommand` callback that the command executor hooks into.
- Update `src/main/agents/manager.ts` -- Wire command executor to PM stream. When `spawn_worker` is received, spawn a worker with the task and the role's system prompt.
- `prompts/architect.md`, `prompts/ux-designer.md`, `prompts/frontend-engineer.md` -- Basic runtime system prompts for the three core worker roles (Personal Website blueprint).

**Files created/modified**:
- `src/main/agents/command-executor.ts` (create)
- `prompts/pm.md` (create)
- `prompts/architect.md` (create)
- `prompts/ux-designer.md` (create)
- `prompts/frontend-engineer.md` (create)
- `src/main/agents/claude.ts` (modify)
- `src/main/agents/manager.ts` (modify)

**Verification**:
1. `npm run dev`. Create a "Personal Website" project. Tell the PM: "I want a portfolio site for my photography."
2. Watch the chat: PM responds with a message (visible) and emits commands (not visible in chat, but logged in the main process console).
3. Watch the board: tickets appear in the Backlog column as `create_ticket` commands execute.
4. A worker spawns (check process list). The worker does some work (likely the architect or designer).
5. When the worker finishes, the PM gets notified and the ticket moves to Done.
6. Invalid commands in the stream are logged and skipped -- they don't crash the app.

This is the **most complex phase** and the most likely to require iteration. The PM prompt may need significant refinement to reliably emit well-formed commands.

**Unblocks**: Phase 7 (progress tracking needs active workers to track).

---

### Phase 7: Progress Tracking + Worker Lifecycle + Rate Limits

**Goal**: Workers write progress files, the main process polls them, and the board updates in real-time. Rate limit detection and auto-retry work.

**What gets built**:
- Progress poller in `src/main/agents/manager.ts` -- Every 5 seconds, read `.tweebs/progress/*.json` in the project directory. Detect status changes. Update SQLite. Push `board:update` and `tweeb:status` via IPC.
- Worker system prompts updated to include progress.json writing instructions.
- Rate limit detection in `src/main/agents/claude.ts` -- Parse NDJSON and stderr for rate limit signals. Set tweeb status to `rate_limited`. Start exponential backoff timer (30s, 1m, 2m, 5m, 10m). Auto-retry.
- Worker exit handling in `src/main/agents/manager.ts` -- On exit code 0: mark ticket done. On non-zero: mark error, notify PM. On SIGTERM: save state.
- Blocked status detection -- if a worker writes `status: "blocked"` to progress.json, notify the PM CLI process by writing context to its stdin.
- `src/main/notifications/index.ts` -- Electron Notification API. Triggered by `request_decision` and `mark_complete` commands.
- Graceful shutdown on `before-quit` -- save PM session ID, SIGTERM all workers, wait 5s, SIGKILL stragglers.

**Files created/modified**:
- `src/main/agents/manager.ts` (modify -- progress polling, exit handling, shutdown)
- `src/main/agents/claude.ts` (modify -- rate limit detection, retry)
- `src/main/notifications/index.ts` (create)
- `prompts/architect.md` (modify -- add progress.json writing instructions)
- `prompts/ux-designer.md` (modify -- same)
- `prompts/frontend-engineer.md` (modify -- same)

**Verification**:
1. `npm run dev`. Start a Personal Website project.
2. As workers run, watch the board: cards update their status lines in real-time (every 5 seconds).
3. Cards slide from Backlog to In Progress to Done as workers progress.
4. If a rate limit is hit: card shows "Taking a short break" with a countdown. After the pause, the worker auto-retries and resumes.
5. Close the app while a worker is running. Reopen. PM says "Welcome back." Incomplete tasks resume.
6. When the project finishes: macOS notification appears. PM says "Your site is ready." Board shows all cards in Done.

**Unblocks**: Phase 8 (onboarding and polish are the last layer).

---

### Phase 8: Onboarding + Blueprints + Polish

**Goal**: First-run experience works end to end. Blueprint-specific dependency checks. Settings screen. Help panel. The app is ready for a demo.

**What gets built**:
- `src/main/onboarding/detect.ts` -- Check installed dependencies: Homebrew, Node, Git, Claude Code. Return status for each.
- `src/main/onboarding/install.ts` -- Run install commands as background child processes. Parse stdout/stderr for password prompts, progress, errors. Map errors to plain English.
- `src/main/ipc/onboarding.ts` -- IPC handlers for `onboard:check` and `onboard:install`.
- `src/renderer/components/Onboarding/WelcomeStep.tsx` -- Name input.
- `src/renderer/components/Onboarding/SubscriptionStep.tsx` -- "$20/month or $100/month" selector (not tier names).
- `src/renderer/components/Onboarding/InstallStep.tsx` -- Progress screen with checkmarks. Password dialog if needed.
- `src/renderer/components/Onboarding/AuthStep.tsx` -- "Logging you in" screen. Opens browser for Claude auth.
- `src/renderer/components/Onboarding/DisclaimerStep.tsx` -- Permissions disclaimer. Plain English.
- `src/main/blueprints/index.ts` -- Load blueprint JSON files. Check blueprint-specific deps. Run scaffolding commands. Write `.mcp.json` to project directory. Create `.tweebs/` coordination directories.
- `src/renderer/components/Settings/SettingsView.tsx` -- Name, re-auth button, notification toggle, about.
- Help/FAQ slide-out panel.
- App icon and window chrome polish.
- Re-onboarding check on every launch (< 2 seconds).

**Files created/modified**:
- `src/main/onboarding/detect.ts` (create)
- `src/main/onboarding/install.ts` (create)
- `src/main/ipc/onboarding.ts` (create)
- `src/renderer/components/Onboarding/WelcomeStep.tsx` (create)
- `src/renderer/components/Onboarding/InstallStep.tsx` (create)
- `src/renderer/components/Onboarding/AuthStep.tsx` (create)
- `src/renderer/components/Onboarding/DisclaimerStep.tsx` (create)
- `src/main/blueprints/index.ts` (create)
- `src/renderer/components/Settings/SettingsView.tsx` (create)
- `src/renderer/App.tsx` (modify -- onboarding flow gating, help panel)
- `src/main/index.ts` (modify -- onboarding check on startup)

**Verification**:
1. Delete `~/Library/Application Support/tweebs/tweebs.db` to simulate first run.
2. `npm run dev`. Onboarding wizard appears.
3. Enter name. Select subscription tier. Install step checks deps (should all pass if dev machine is set up). Auth step opens browser (or skips if already authed). Disclaimer step shows. Accept.
4. Land on Home screen. Create a "Personal Website" project.
5. Blueprint engine checks deps (none for Personal Website). Scaffolds Next.js project in `~/tweebs-projects/{name}/`. Creates `.tweebs/` directories. Writes `.mcp.json`.
6. PM spawns. Full flow from Phase 6 verification runs.
7. Settings: change name, toggle notifications.
8. Close app, reopen: re-onboarding check passes in < 2 seconds, straight to Home.

---

## 3. Critical Path

The absolute minimum to prove the concept works. If you could only build 3 things:

### Demo 1: CLI Wrapper Proof (30 minutes)

Prove that `claude -p --output-format stream-json` can be spawned from Node.js, its NDJSON output parsed line-by-line, and text content extracted in real-time.

**Standalone test script** (no Electron needed):

```typescript
// scripts/test-cli-wrapper.ts
import { spawn } from 'child_process'

const child = spawn('claude', [
  '-p', 'Say hello and tell me a one-sentence joke.',
  '--output-format', 'stream-json',
  '--dangerously-skip-permissions'
], { stdio: ['pipe', 'pipe', 'pipe'] })

let buffer = ''

child.stdout.on('data', (data: Buffer) => {
  buffer += data.toString()
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const parsed = JSON.parse(line)
      console.log('[PARSED]', JSON.stringify(parsed).slice(0, 200))
    } catch {
      console.log('[RAW]', line.slice(0, 200))
    }
  }
})

child.stderr.on('data', (data: Buffer) => {
  console.error('[STDERR]', data.toString())
})

child.on('exit', (code) => {
  console.log('[EXIT]', code)
})
```

Run with: `npx tsx scripts/test-cli-wrapper.ts`

### Demo 2: PM Command Extraction (1 hour)

Prove that a Claude CLI process, given the PM system prompt, reliably emits structured JSON commands that can be parsed.

**Standalone test script**:

```typescript
// scripts/test-pm-commands.ts
import { spawn } from 'child_process'
import { readFileSync } from 'fs'

const systemPrompt = readFileSync('prompts/pm.md', 'utf-8')

const child = spawn('claude', [
  '-p', 'The user wants to build a photography portfolio website.',
  '--output-format', 'stream-json',
  '--dangerously-skip-permissions',
  '--system-prompt', systemPrompt
], { stdio: ['pipe', 'pipe', 'pipe'] })

// ... same NDJSON parsing as Demo 1, plus:
// Scan text content for JSON command blocks
// Validate each block matches PMCommand schema
// Log: "COMMAND FOUND: {cmd: 'create_ticket', ...}" or "COMMAND INVALID: ..."
```

If `--system-prompt` is not a valid CLI flag, pass the system prompt as the first part of the `-p` prompt, separated by a delimiter.

### Demo 3: Electron Chat + Live CLI (2 hours)

The bare minimum Electron app with a chat input and a Claude CLI process. Type a message, see the real response stream in. This is Phases 1 + 3 + 5 compressed into the smallest possible surface.

No board. No database. No IPC event system. Just:
- BrowserWindow with a text input and a message list
- contextBridge exposing a `send(message)` function
- Main process spawns `claude -p`, pipes the message, streams the response back

This proves the full Electron-to-CLI-to-renderer pipeline.

---

## 4. Risk Mitigation -- Early Verification

These are the unknowns that could change the architecture. Verify them before investing in the full build.

### 4.1 Does `--resume` work with `-p` and `--output-format stream-json`?

The PM needs multi-turn conversations. `--resume` is the designed approach. If it doesn't work, the fallback is expensive (resend full history each turn).

**Test**:

```bash
# Turn 1: send a message, capture the session ID from output
claude -p "Remember: the secret word is 'banana'." --output-format stream-json --dangerously-skip-permissions 2>&1 | tee /tmp/turn1.json

# Extract session_id from the output (look for it in the NDJSON)
# The session ID may appear in a "system" type message or in the final result
grep -i "session" /tmp/turn1.json

# Turn 2: resume with that session ID
claude -p "What's the secret word?" --resume {SESSION_ID} --output-format stream-json --dangerously-skip-permissions
```

**Expected**: Turn 2 responds with "banana" (proving it has context from Turn 1).

**If this fails**: Implement the accumulation fallback in `src/main/agents/claude.ts`. Store the full conversation history in SQLite's messages table. On each turn, construct a single prompt containing the entire conversation. Token cost increases linearly with conversation length, but it is guaranteed to work.

### 4.2 Does the PM reliably emit structured JSON commands?

The entire coordination model depends on the PM outputting parseable JSON blocks.

**Test**:

```bash
# Create a minimal PM prompt that instructs JSON command emission
cat > /tmp/test-pm-prompt.md << 'EOF'
You are a project manager. When you need to take an action, emit a JSON command block.

Available commands:
- {"cmd": "message_user", "content": "your message"}
- {"cmd": "create_ticket", "title": "...", "description": "...", "assignTo": "..."}
- {"cmd": "spawn_worker", "role": "...", "task": {"title": "...", "description": "...", "acceptanceCriteria": [...]}}

Always wrap commands in fenced code blocks with the json language tag.
Always emit a message_user command for anything the user should see.
EOF

claude -p "$(cat /tmp/test-pm-prompt.md)

The user says: I want to build a portfolio website for my photography." \
  --output-format stream-json \
  --dangerously-skip-permissions | tee /tmp/pm-test.json
```

**Parse the output and check**:
1. Are there valid JSON blocks in the response?
2. Do they match the PMCommand schema?
3. Is there a `message_user` command with human-readable content?
4. Are there `create_ticket` commands with reasonable titles?

Run this 5 times and check the success rate. If the PM emits valid commands < 80% of the time, the prompt needs refinement before proceeding.

### 4.3 Can we parse NDJSON streaming from a child process in real-time?

The key concern: does Node.js's child_process stream data line-by-line, or in arbitrary chunks that split JSON lines?

**Test**:

```typescript
// scripts/test-ndjson-parse.ts
import { spawn } from 'child_process'

const child = spawn('claude', [
  '-p', 'Write a 500-word essay about cats.',
  '--output-format', 'stream-json',
  '--dangerously-skip-permissions'
], { stdio: ['pipe', 'pipe', 'pipe'] })

let buffer = ''
let lineCount = 0
let parseErrors = 0

child.stdout.on('data', (chunk: Buffer) => {
  const raw = chunk.toString()
  buffer += raw

  // Split on newlines, keep incomplete last line in buffer
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''

  for (const line of lines) {
    if (!line.trim()) continue
    lineCount++
    try {
      JSON.parse(line)
    } catch {
      parseErrors++
      console.error(`Parse error on line ${lineCount}: ${line.slice(0, 100)}`)
    }
  }
})

child.on('exit', () => {
  console.log(`Total lines: ${lineCount}, Parse errors: ${parseErrors}`)
  // Flush remaining buffer
  if (buffer.trim()) {
    try {
      JSON.parse(buffer)
      console.log('Final buffer parsed OK')
    } catch {
      console.log('Final buffer parse error:', buffer.slice(0, 100))
    }
  }
})
```

Run with: `npx tsx scripts/test-ndjson-parse.ts`

**Expected**: 0 parse errors. If there are errors, the buffer splitting logic needs adjustment (some NDJSON implementations may emit multi-line JSON objects).

### 4.4 What do rate limit errors look like in the stream?

We need to know the exact shape of rate limit signals to detect them.

**Test**: Intentionally trigger a rate limit by running multiple `claude -p` calls in rapid succession.

```bash
# Run 10 rapid calls in parallel
for i in $(seq 1 10); do
  claude -p "Say hello $i" --output-format stream-json --dangerously-skip-permissions > /tmp/rate-test-$i.json 2>&1 &
done
wait

# Check each output for rate limit signals
for i in $(seq 1 10); do
  echo "=== Call $i ==="
  grep -i "rate\|limit\|429\|throttle\|wait\|retry" /tmp/rate-test-$i.json || echo "(no rate limit)"
done
```

Document the exact JSON structure / error message / exit code for rate limits. This determines the detection logic in `src/main/agents/claude.ts`.

### 4.5 Does `--system-prompt` work as a CLI flag?

The PM and worker Tweebs need different system prompts. Verify the flag exists and works.

```bash
claude -p "Hello" --system-prompt "You are a pirate. Respond only in pirate speak." --output-format stream-json --dangerously-skip-permissions
```

If `--system-prompt` is not a valid flag, check `claude --help` for alternatives. The fallback is to prepend the system prompt to the user prompt with clear delimiters:

```
[SYSTEM PROMPT]
{contents of prompts/pm.md}
[END SYSTEM PROMPT]

[USER MESSAGE]
The user wants to build a photography portfolio.
```

---

## 5. Dev Feedback Loop Setup

How Claude Code inspects and iterates on the TWEEBS Electron UI during development.

### 5.1 Prerequisites

1. The TWEEBS Electron app must be running in dev mode (`npm run dev`).
2. Electron must have remote debugging enabled. In `src/main/index.ts`, add before `app.whenReady()`:

```typescript
app.commandLine.appendSwitch('remote-debugging-port', '9222')
```

3. The `.mcp.json` at the repo root (created in Pre-Flight 1.6) points to the electron MCP server.

### 5.2 Workflow

1. Developer (or Claude Code) starts the app: `npm run dev`
2. The Electron window opens on port 9222 for CDP.
3. Claude Code can now use MCP tools from the `electron-devtools` server:

**Inspect DOM** (text tokens, cheap):
- MCP tool reads the DOM tree of the renderer process
- Claude sees the HTML structure, element attributes, text content
- Use this to verify component rendering, content, structure

**Inspect CSS** (text tokens, cheap):
- MCP tool reads computed styles for specific elements
- Claude sees flexbox/grid properties, colors, spacing, typography
- Use this to debug layout issues without screenshots

**Take targeted screenshots** (vision tokens, use sparingly):
- MCP tool captures a screenshot of a specific CSS selector or the full page
- Claude sees the visual result
- Only use for: color verification, visual design QA, alignment checks

**Click/type interactions** (no tokens for the action itself):
- MCP tool can click elements, type into inputs, navigate
- Use for: testing onboarding flow, chat interaction, board interactions
- Claude issues the action, then inspects the DOM to see the result

### 5.3 Iteration Cycle

```
Edit component code
    |
    v
electron-vite HMR reloads the renderer (< 1 second)
    |
    v
Claude Code: inspect DOM via MCP (verify structure, text content)
    |
    v
If layout issue: inspect CSS via MCP (check flexbox, spacing)
    |
    v
If visual issue: take targeted screenshot via MCP (check colors, alignment)
    |
    v
Adjust code, repeat
```

### 5.4 Example MCP Interactions

Claude Code might issue these tool calls during a dev session:

```
// After editing ChatView.tsx, verify the message list renders
Tool: electron-devtools.getDOM({ selector: '.chat-messages' })
// Returns: <div class="chat-messages"><div class="message-bubble pm">...</div>...</div>

// Check if the input is at the bottom
Tool: electron-devtools.getComputedStyle({ selector: '.chat-input-container' })
// Returns: { position: 'fixed', bottom: '0', width: '100%', ... }

// Visual QA of the board
Tool: electron-devtools.screenshot({ selector: '.board-view' })
// Returns: image of just the board panel

// Test sending a message
Tool: electron-devtools.click({ selector: '.chat-input' })
Tool: electron-devtools.type({ text: 'Build me a website' })
Tool: electron-devtools.click({ selector: '.chat-send-button' })
// Then inspect DOM to see if the message appeared
```

### 5.5 Cost-Saving Rules

1. **DOM inspection first, always.** Never take a screenshot when a DOM read would answer the question.
2. **Batch edits.** Make 3-5 related CSS changes before inspecting, not after each one.
3. **Targeted screenshots only.** Screenshot a specific component, not the full window.
4. **Cache knowledge.** If Claude Code already knows the DOM structure from a recent read, don't re-read it unless the component was modified.

---

## 6. What NOT to Build in V1

These features are documented in the specs but explicitly deferred. Do not build them.

### Voice and Audio
- Kokoro TTS voice output for PM messages (V2)
- Web Speech API / Whisper voice input (V2)
- Animated PM avatar with lip sync (V3)

### SMS / Cloud Notifications
- Twilio SMS integration (V2)
- Two-way SMS for decision responses (V2+)
- Any server-side notification infrastructure

### Multi-Backend Support
- Codex CLI integration (V2+)
- `AgentBackend` abstraction interface (build only the Claude Code implementation; don't build the interface polymorphism until there's a second backend)
- Model selection UI in Settings

### Advanced Blueprints
- Custom/user-created Blueprints (future)
- Blueprint sharing / community marketplace
- Blueprint JSON editing UI

### Deployment Automation
- Vercel deployment flow (documented as optional follow-up in PM conversation, but don't build the automation in V1)
- App Store submission flow
- Chrome Web Store publishing
- Shopify theme deployment

### GitHub Integration
- GitHub repo creation or push
- Any remote git operations
- GitHub auth flow

### Parallel Worker Execution
- Build the sequential worker model only. The rate limit budget estimation and parallel execution logic (`RateBudget` interface) are V2.
- Rate budget pre-flight estimation (the PM can mention time estimates from the blueprint, but don't build the dynamic estimation system).

### Advanced Onboarding
- Password prompt interception for sudo (complex edge case -- in V1, if Homebrew/Node aren't installed, show a plain-English guide and link instead of attempting background install with password piping)
- Xcode CLI tools download progress tracking
- Automatic error code bundling (TW-ERR-XXXX) -- in V1, just log to a file and tell users to send the log file

### Advanced Board Features
- Confetti animation on project completion (nice-to-have, defer)
- Card slide animations between columns (use simple opacity transitions in V1)
- Progress bar on individual cards

### Phone Number Collection
- No phone number field in Settings or Onboarding
- No subscription tier storage (the "$20 or $100" selection is informational only in V1 -- it doesn't gate any behavior)

### Code Signing and Notarization
- Required for distribution but not for development. Build and test unsigned.
- Set up signing and notarization only when preparing for actual user distribution.

---

## Appendix A: File Manifest

Complete list of files to create, organized by phase. Use this as a checklist.

### Pre-Flight
- [ ] `electron.vite.config.ts`
- [ ] `package.json` (merged with scaffold)
- [ ] `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- [ ] `src/shared/types.ts`
- [ ] `.mcp.json` (dev-time MCP config)

### Phase 1
- [ ] `src/main/index.ts`
- [ ] `src/main/db/schema.ts`
- [ ] `src/main/db/index.ts`
- [ ] `src/preload/index.ts`
- [ ] `src/renderer/index.html`
- [ ] `src/renderer/main.tsx`
- [ ] `src/renderer/App.tsx`
- [ ] `src/renderer/styles/global.css`

### Phase 2
- [ ] `src/main/ipc/index.ts`
- [ ] `src/main/ipc/projects.ts`
- [ ] `src/renderer/stores/projectStore.ts`
- [ ] `src/renderer/stores/appStore.ts`
- [ ] `src/renderer/components/ProjectCreate/NewProjectView.tsx`

### Phase 3
- [ ] `src/renderer/components/Chat/ChatView.tsx`
- [ ] `src/renderer/components/Chat/MessageBubble.tsx`
- [ ] `src/renderer/components/Chat/ChatInput.tsx`
- [ ] `src/renderer/stores/chatStore.ts`
- [ ] `src/main/ipc/agents.ts`

### Phase 4
- [ ] `src/renderer/components/Board/BoardView.tsx`
- [ ] `src/renderer/components/Board/Column.tsx`
- [ ] `src/renderer/components/Board/Card.tsx`
- [ ] `src/renderer/stores/boardStore.ts`

### Phase 5
- [ ] `src/main/agents/types.ts`
- [ ] `src/main/agents/claude.ts`
- [ ] `src/main/agents/manager.ts`

### Phase 6
- [ ] `src/main/agents/command-executor.ts`
- [ ] `prompts/pm.md`
- [ ] `prompts/architect.md`
- [ ] `prompts/ux-designer.md`
- [ ] `prompts/frontend-engineer.md`

### Phase 7
- [ ] `src/main/notifications/index.ts`

### Phase 8
- [ ] `src/main/onboarding/detect.ts`
- [ ] `src/main/onboarding/install.ts`
- [ ] `src/main/ipc/onboarding.ts`
- [ ] `src/main/blueprints/index.ts`
- [ ] `src/renderer/components/Onboarding/WelcomeStep.tsx`
- [ ] `src/renderer/components/Onboarding/InstallStep.tsx`
- [ ] `src/renderer/components/Onboarding/AuthStep.tsx`
- [ ] `src/renderer/components/Onboarding/DisclaimerStep.tsx`
- [ ] `src/renderer/components/Settings/SettingsView.tsx`
- [ ] `prompts/backend-engineer.md`
- [ ] `prompts/mobile-engineer.md`
- [ ] `scripts/detect.sh`

---

## Appendix B: Architecture Quick Reference

For the builder's reference. These are the key patterns. See the full docs for details.

### Process Model
- **Main process**: deterministic execution. Owns DB, spawns processes, executes PM commands.
- **Renderer process**: React UI. Receives state via IPC events. Sends user input via IPC invoke.
- **PM Tweeb**: long-lived `claude -p` process with `--resume` for multi-turn. Emits JSON commands.
- **Worker Tweebs**: short-lived `claude -p` processes. One per task. Exit when done.

### Data Flow
```
User types message
  -> IPC invoke 'chat:send'
    -> main process writes to PM stdin
      -> PM streams NDJSON response
        -> Command Executor parses commands
          -> create_ticket -> SQLite -> IPC event -> Board
          -> message_user -> IPC event -> Chat
          -> spawn_worker -> TweebManager -> new child process
```

### Key Directories at Runtime
- `~/Library/Application Support/tweebs/tweebs.db` -- SQLite database
- `~/tweebs-projects/{name}/` -- user project files
- `~/tweebs-projects/{name}/.tweebs/` -- coordination files (tasks, progress, artifacts)
- `~/tweebs-projects/{name}/.mcp.json` -- project-level MCP config

### PM Command Protocol
The PM emits fenced JSON blocks in its response text. The Command Executor strips them from the visible chat and executes them. See `src/shared/types.ts` for the `PMCommand` type.

### IPC Pattern
- **Main -> Renderer**: `webContents.send(channel, data)` + `ipcRenderer.on(channel, handler)` via preload
- **Renderer -> Main**: `ipcRenderer.invoke(channel, ...args)` + `ipcMain.handle(channel, handler)` via preload
- All IPC channels are typed in `src/shared/types.ts`

### SQLite Pattern
- Singleton in `src/main/db/index.ts`
- Synchronous API (better-sqlite3 is sync, which is fine for Electron main process)
- WAL mode for crash safety
- All timestamps are Unix epoch milliseconds

---

## Appendix C: Estimated Timeline

Rough time per phase for a focused builder with Claude Code assistance:

| Phase | Description | Estimate |
|-------|-------------|----------|
| Pre-Flight | Scaffold + deps + config | 1-2 hours |
| Phase 1 | Shell + DB + blank window | 2-3 hours |
| Phase 2 | IPC + project CRUD + nav | 3-4 hours |
| Phase 3 | Chat UI (mock) | 3-4 hours |
| Phase 4 | Board UI (mock) | 3-4 hours |
| Phase 5 | CLI wrapper (real) | 4-6 hours |
| Phase 6 | Command protocol + executor | 6-8 hours |
| Phase 7 | Progress + lifecycle + rate limits | 4-6 hours |
| Phase 8 | Onboarding + blueprints + polish | 6-8 hours |
| **Total** | | **~32-45 hours** |

Phase 6 is the riskiest and most variable. Budget extra time for PM prompt iteration.

---

## Appendix D: Reference Docs

These docs contain the full specifications for each system. The development plan summarizes what to build; the docs contain the detailed requirements.

| Doc | Covers |
|-----|--------|
| `docs/architecture.md` | System overview, PM command protocol, data flow, security model |
| `docs/agent-engine.md` | CLI wrapping, streaming, rate limits, process lifecycle |
| `docs/multi-agent.md` | Coordination model, task files, progress files, handoffs |
| `docs/pm-tweeb.md` | PM personality, conversation flow, decision escalation |
| `docs/onboarding.md` | First-run setup, dependency install, auth flow |
| `docs/blueprints.md` | Blueprint schema, install automation, scaffolding |
| `docs/kanban-board.md` | Board layout, card states, animations, completion experience |
| `docs/database.md` | SQLite schema, indexes, settings, migration strategy |
| `docs/notifications-voice.md` | macOS notifications (V1), voice/SMS (V2) |
| `docs/dev-feedback-loop.md` | Chrome DevTools MCP for Electron UI iteration |
| `docs/project-structure.md` | Directory layout, file manifest, build tooling |
| `docs/ux-spec.md` | Screens, navigation, error messages, responsive behavior |
| `blueprints/personal-website.json` | Personal Website blueprint definition |
| `blueprints/ios-app.json` | iOS App blueprint definition |
| `blueprints/chrome-extension.json` | Chrome Extension blueprint definition |
| `blueprints/shopify-store.json` | Shopify Store blueprint definition |
