# Architecture

## Overview

TWEEBS is a three-layer system: an Electron shell, a set of managed CLI child processes (Tweebs), and a file-based coordination layer that connects them.

```
┌──────────────────────────────────────────────────────┐
│                  Electron Main Process                │
│                                                       │
│  ┌─────────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ TweebManager│  │  SQLite   │  │  GitHub CLI Mgr │  │
│  │ (spawn,     │  │  (state,  │  │  (repo create,  │  │
│  │  track,     │  │  tickets, │  │   clone, push)  │  │
│  │  kill)      │  │  messages)│  │                 │  │
│  └──────┬──────┘  └──────────┘  └─────────────────┘  │
│         │                                             │
│  ┌──────┴──────────────────────────────────────────┐  │
│  │         Child Processes (one per Tweeb)          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │
│  │  │ claude   │ │ claude   │ │ codex            │ │  │
│  │  │ -p       │ │ -p       │ │ (equivalent)     │ │  │
│  │  │ PM Tweeb │ │ FE Tweeb │ │ BE Tweeb         │ │  │
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
         │     File System (Coordination)       │
         │  ~/.tweebs/projects/{id}/            │
         │    ├── tasks/{tweeb-id}.json         │
         │    └── repos/{tweeb-role}/           │
         │        └── progress.json             │
         └─────────────────────────────────────┘
```

## Process Model

### Electron Main Process
- Owns the TweebManager (spawns, monitors, and kills CLI child processes)
- Owns the SQLite database (projects, tickets, messages, settings)
- Runs the GitHub CLI wrapper (repo creation, clone, collaborator management)
- Runs the onboarding/install detection logic
- Polls progress.json files from each Tweeb's repo
- Pushes state updates to the renderer via IPC

### Electron Renderer Process
- React app with Zustand stores
- Receives real-time updates from main process via IPC events
- Three main views: Onboarding, Chat (PM conversation), Board (kanban)
- Read-only board — users don't drag cards, Tweebs move their own
- Sends user messages to PM via IPC → main process → PM child process

### Child Processes (Tweebs)
- Each Tweeb is a `claude -p` or `codex` CLI process
- Runs with `--dangerously-skip-permissions` and `--output-format stream-json`
- Has its own working directory (cloned GitHub repo)
- Has its own system prompt (from `.claude/agents/` or `prompts/`)
- Writes `progress.json` to its working directory on meaningful actions
- PM Tweeb has access to a shared coordination directory for writing task files

## Data Flow

### User → PM → Workers
1. User types message in Chat UI (renderer)
2. IPC `chat:send` → main process
3. Main process pipes message to PM Tweeb's stdin
4. PM Tweeb responds (streamed via NDJSON) → main process parses → IPC `chat:message` → renderer
5. If PM creates tickets: written to SQLite → IPC `board:update` → renderer
6. If PM spawns workers: TweebManager creates new child processes + GitHub repos
7. PM writes task files to coordination directory

### Workers → Board
1. Worker Tweeb does work in its repo, commits
2. Worker writes/updates `progress.json` in repo root
3. Main process polls `progress.json` every 5 seconds
4. Changes detected → update SQLite tickets → IPC `board:update` → renderer
5. Cards move across columns on the board

### Decision Escalation
1. Worker hits a blocker → writes to `progress.json` with `status: "blocked"`
2. PM detects blocked status → formulates question for user
3. PM sends message → main process → IPC → Chat UI
4. If SMS enabled: main process → Twilio API → user's phone
5. User responds → answer piped back to PM → PM updates task file → worker resumes

## Security Model

- No API keys stored or transmitted — all auth is via CLI login (`claude auth`, `gh auth login`)
- `--dangerously-skip-permissions` accepted via one-time user disclaimer
- Each Tweeb runs in its own repo directory (filesystem isolation)
- PM has cross-repo read/write; workers are scoped to their own repo
- No network access beyond what the CLI processes need (GitHub, Claude/OpenAI API)
- SQLite database is local only, no cloud sync
