# TWEEBS — Claude Code Project Instructions

## Project Overview

TWEEBS is an Electron desktop app (Mac first) that gives non-technical users a team of AI engineers ("Tweebs"). Each Tweeb is a Claude Code CLI process spawned as a child process using the user's own subscription auth. The PM Tweeb coordinates work, the user only talks to the PM. No GitHub account needed. No terminal ever visible. Everything runs locally.

## Tech Stack

- **Runtime**: Electron (electron-vite build tool)
- **UI**: React + TypeScript
- **State**: Zustand (renderer), better-sqlite3 (persistence)
- **Agent backend**: Claude Code CLI (`claude -p --output-format stream-json`) — V1 is Claude-only
- **Build**: electron-vite

## Key Architectural Decisions

- **PM Command Protocol**: The PM Tweeb outputs structured JSON commands. The main process's Command Executor parses and executes them (create tickets, spawn workers, etc.). The PM is the brain; main process is the hands.
- **Workers are per-task processes**: Spawned by the main process, receive task via stdin, exit when done. No polling.
- **One local repo per project**: All Tweebs work in `~/tweebs-projects/{name}/`. No GitHub. No remote repos.
- **Project-level MCP config**: `.mcp.json` in the project directory, never global `~/.claude/mcp.json`.
- **Sequential worker execution by default**: One worker at a time to respect rate limits. Parallel only when budget allows.
- **No terminal ever visible**: All CLI operations run as background child processes. Auth opens the browser. Install runs silently. The user never sees a terminal window.

## Project Structure

```
tweebs/
├── assets/avatars/          # Tweeb avatar images
├── blueprints/              # Blueprint JSON definitions
├── docs/                    # Engineering specs (read these first)
├── prompts/                 # Runtime Tweeb system prompts (for user projects)
├── scripts/                 # Onboarding shell scripts
├── src/
│   ├── main/                # Electron main process
│   │   ├── agents/          # CLI wrapper, Command Executor, TweebManager
│   │   ├── db/              # SQLite schema + queries
│   │   ├── ipc/             # IPC handler registration
│   │   ├── onboarding/      # Dependency detection + install
│   │   ├── blueprints/      # Blueprint loader
│   │   └── notifications/   # macOS Notification API
│   ├── renderer/            # React app
│   │   ├── components/      # Chat/, Board/, Onboarding/, etc.
│   │   ├── stores/          # Zustand stores
│   │   └── styles/
│   ├── shared/              # Types shared across processes
│   └── preload/             # IPC bridge
└── .claude/agents/          # Dev-time Claude Code agents (for building TWEEBS)
```

## Dev Workflow

- Use Chrome DevTools MCP (`electron-mcp-server`) for visual UI iteration — inspect DOM/CSS as text tokens, not screenshots
- Each component area has its own engineering spec in `docs/`
- `.claude/agents/` = dev-time agents (TWEEBS-specific). `prompts/` = runtime agents (generic, for user projects).

## Conventions

- TypeScript strict mode
- No API keys in the codebase — everything uses subscription auth via CLI
- SQLite for all persistence, no cloud services
- PM command protocol for all PM → system interactions (see docs/architecture.md)
- macOS Notification API for user alerts (no Twilio, no SMS in V1)

## Key Docs

- `docs/architecture.md` — system overview, PM command protocol, data flow
- `docs/agent-engine.md` — CLI wrapping, streaming, rate limits, process models
- `docs/multi-agent.md` — coordination, task dispatch, progress tracking
- `docs/dev-feedback-loop.md` — how to iterate on UI cheaply with Chrome DevTools MCP
