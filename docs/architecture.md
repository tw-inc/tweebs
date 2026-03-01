# Architecture

## Overview

TWEEBS is a three-layer system: an Electron shell, a set of managed CLI child processes (Tweebs), and a local file-based coordination layer.

Everything runs locally. No GitHub account required. No cloud services. The user needs a Claude Pro/Max subscription and nothing else.

```
┌──────────────────────────────────────────────────────┐
│                  Electron Main Process                │
│                                                       │
│  ┌──────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ TweebManager │  │  SQLite   │  │  Command       │  │
│  │ (spawn,      │  │  (state,  │  │  Executor      │  │
│  │  dispatch,   │  │  tickets, │  │  (parses PM    │  │
│  │  kill)       │  │  messages)│  │   commands,    │  │
│  └──────┬───────┘  └──────────┘  │   acts on them) │  │
│         │                        └────────────────┘  │
│  ┌──────┴──────────────────────────────────────────┐  │
│  │         Child Processes (one per Tweeb)          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │
│  │  │ claude   │ │ claude   │ │ claude           │ │  │
│  │  │ -p       │ │ -p       │ │ -p               │ │  │
│  │  │ PM Tweeb │ │ FE Tweeb │ │ Designer Tweeb   │ │  │
│  │  └──────────┘ └──────────┘ └──────────────────┘ │  │
│  └─────────────────────────────────────────────────┘  │
│         │ IPC (contextBridge)                         │
├─────────┼─────────────────────────────────────────────┤
│         ▼           Renderer Process                  │
│  ┌─────────────────────────────────────────────────┐  │
│  │                React App                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │  │
│  │  │ Chat UI  │  │ Kanban   │  │ Onboarding    │  │  │
│  │  │ (PM)     │  │ Board    │  │ Wizard        │  │  │
│  │  └──────────┘  └──────────┘  └───────────────┘  │  │
│  │                                                   │  │
│  │  Zustand stores ← IPC events from main process   │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────┐
         │     Local File System                │
         │  ~/tweebs-projects/{project-name}/   │
         │    ├── .git/                         │
         │    ├── .tweebs/                      │
         │    │   ├── tasks/{tweeb-id}.json     │
         │    │   ├── progress/{tweeb-id}.json  │
         │    │   └── architecture.md           │
         │    └── src/... (the actual project)  │
         └─────────────────────────────────────┘
```

## Process Model

### Electron Main Process

The main process is the **deterministic execution layer**. It owns all state and all side effects. Tweebs are brains; the main process is hands.

Responsibilities:
- **Command Executor**: Parses structured JSON commands from the PM Tweeb's output stream and executes them (create tickets, spawn workers, move cards, etc.)
- **TweebManager**: Spawns CLI child processes, dispatches tasks to workers via stdin, monitors process health, handles cleanup
- **SQLite**: All persistent state (projects, tickets, messages, settings)
- **Task Dispatcher**: Watches for new tasks written by the PM, sends them to the correct worker's stdin
- **Progress Poller**: Reads progress.json files from each Tweeb's working area every 5 seconds, updates SQLite and pushes to renderer
- **IPC Bridge**: Pushes state changes to the renderer via IPC events

### Electron Renderer Process

- React app with Zustand stores
- Receives real-time updates from main process via IPC events
- Three main views: Onboarding, Chat (PM conversation), Board (kanban)
- Read-only board — users don't drag cards, Tweebs move their own
- Sends user messages to PM via IPC → main process → PM child process stdin

### Child Processes (Tweebs)

- Each Tweeb is a `claude -p` CLI process
- Runs with `--dangerously-skip-permissions` and `--output-format stream-json`
- Has its own working directory within the project
- Has its own system prompt (from `prompts/`)
- **PM Tweeb**: Long-lived process (session resumption via `--resume`). Outputs structured JSON commands that the main process executes. Handles all user communication and coordination logic.
- **Worker Tweebs**: Spawned per-task by the main process. Receive their task via stdin. Work in the project directory. Write progress.json on meaningful actions. Exit when done.

## PM Command Protocol

The PM Tweeb is an LLM — it generates intent. The main process executes actions. They communicate via structured JSON blocks in the PM's NDJSON output stream.

When the PM needs to perform a system action, it emits a JSON command in its response. The main process's Command Executor parses the stream and acts on these:

```typescript
type PMCommand =
  | { cmd: 'create_ticket', title: string, description: string, assignTo: string, dependsOn?: string[] }
  | { cmd: 'move_ticket', ticketId: string, column: 'backlog' | 'in_progress' | 'done' }
  | { cmd: 'spawn_worker', role: string, task: { title: string, description: string, acceptanceCriteria: string[] } }
  | { cmd: 'kill_worker', tweebId: string }
  | { cmd: 'message_user', content: string }
  | { cmd: 'request_decision', question: string, options: string[] }
  | { cmd: 'mark_complete', summary: string }
```

The PM's system prompt instructs it to emit these commands as fenced JSON blocks. The Command Executor strips them from the visible chat stream (users see the `message_user` content, not the raw commands).

Example PM output:
```
```json
{"cmd": "message_user", "content": "Got it. Building a portfolio site. Hiring the team."}
```
```json
{"cmd": "create_ticket", "title": "Design system and visual direction", "assignTo": "ux-designer", "dependsOn": []}
```
```json
{"cmd": "spawn_worker", "role": "ux-designer", "task": {"title": "Design system", "description": "Create visual direction for a minimal portfolio site", "acceptanceCriteria": ["Color palette defined", "Typography defined", "Layout specs for homepage"]}}
```
```

## Data Flow

### User → PM → Workers
1. User types message in Chat UI (renderer)
2. IPC `chat:send` → main process
3. Main process sends message to PM Tweeb's stdin (or spawns new session via `--resume`)
4. PM Tweeb responds (streamed via NDJSON) → Command Executor parses commands
5. `message_user` commands → IPC `chat:message` → renderer (user sees PM's response)
6. `create_ticket` commands → SQLite insert → IPC `board:update` → renderer
7. `spawn_worker` commands → TweebManager spawns a new CLI process with the task, in the project directory

### Workers → Board
1. Worker Tweeb does work in the project directory, commits to local git
2. Worker writes/updates `.tweebs/progress/{tweeb-id}.json`
3. Main process polls progress files every 5 seconds
4. Changes detected → update SQLite tickets → IPC `board:update` → renderer
5. Cards move across columns on the board
6. When worker exits with success → main process marks ticket as done

### Decision Escalation
1. Worker hits a blocker → writes to progress.json with `status: "blocked"`
2. Main process detects blocked status → notifies PM (sends context to PM's stdin)
3. PM evaluates → either resolves it or emits `request_decision` command
4. Main process shows decision prompt in Chat UI (and triggers macOS notification)
5. User responds → answer sent to PM stdin → PM emits `update_task` or `spawn_worker` with resolution
6. Worker gets new task dispatch with the unblocked context

## Project Structure (on disk)

One local directory per project. One local git repo. All Tweebs work in the same repo.

```
~/tweebs-projects/my-portfolio/
├── .git/                        # Local git, no remote needed
├── .tweebs/                     # TWEEBS coordination files
│   ├── tasks/                   # Task files written by PM
│   │   ├── fe-001.json
│   │   └── designer-001.json
│   ├── progress/                # Progress files written by workers
│   │   ├── fe-001.json
│   │   └── designer-001.json
│   └── architecture.md          # Written by architect Tweeb
├── .mcp.json                    # Project-level MCP config (not global)
├── src/                         # Actual project source code
├── package.json
└── ...
```

## Security Model

- No API keys stored or transmitted — all auth is via CLI login (`claude auth`)
- `--dangerously-skip-permissions` accepted via one-time user disclaimer
- All Tweebs work in the same project directory (no filesystem isolation between them — they're on the same team)
- SQLite database is local only, no cloud sync
- No GitHub account needed — everything is local git
- No network access beyond what Claude Code needs (Anthropic API)
- Project-level `.mcp.json` — MCP configs scoped to the project, not global
