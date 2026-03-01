# TWEEBS — Claude Code Project Instructions

## Project Overview

TWEEBS is an Electron desktop app (Mac first) that gives non-technical users a team of AI engineers ("Tweebs"). Each Tweeb is a Claude Code or OpenAI Codex CLI process spawned as a child process using the user's own subscription auth. The PM Tweeb coordinates work, the user only talks to the PM.

## Tech Stack

- **Runtime**: Electron (electron-vite build tool)
- **UI**: React + TypeScript
- **State**: Zustand (renderer), better-sqlite3 (persistence)
- **Agent backends**: Claude Code CLI (`claude -p --output-format stream-json`), OpenAI Codex CLI
- **GitHub**: `gh` CLI for repo creation and management
- **Build**: electron-vite

## Project Structure

```
tweebs/
├── assets/avatars/          # Tweeb avatar images
├── blueprints/              # Blueprint JSON definitions
├── docs/                    # Engineering specs (read these first)
├── prompts/                 # Tweeb system prompts (runtime)
├── scripts/                 # Onboarding shell scripts
├── src/
│   ├── main/                # Electron main process
│   │   ├── agents/          # CLI wrappers + TweebManager
│   │   ├── db/              # SQLite schema + queries
│   │   ├── github/          # gh CLI wrapper
│   │   ├── ipc/             # IPC handler registration
│   │   ├── onboarding/      # Dependency detection + install
│   │   └── blueprints/      # Blueprint loader
│   ├── renderer/            # React app
│   │   ├── components/      # Chat/, Board/, Onboarding/, etc.
│   │   ├── stores/          # Zustand stores
│   │   └── styles/
│   ├── shared/              # Types shared across processes
│   └── preload/             # IPC bridge
└── .claude/agents/          # Dual-purpose agent definitions
```

## Dev Workflow

- Use Chrome DevTools MCP (`electron-mcp-server`) for visual UI iteration — inspect DOM/CSS as text tokens, not screenshots
- Each component area has its own engineering spec in `docs/`
- Agent files in `.claude/agents/` define both dev-time Claude Code agents AND runtime Tweeb behavior

## Conventions

- TypeScript strict mode
- No API keys in the codebase — everything uses subscription auth via CLI
- SQLite for all persistence, no cloud services
- File-based inter-agent coordination (task files + progress.json polling)
- `--dangerously-skip-permissions` for all Tweeb CLI processes

## Key Docs

- `docs/architecture.md` — system overview, process model, data flow
- `docs/agent-engine.md` — CLI wrapping, streaming, rate limits
- `docs/multi-agent.md` — coordination, task files, progress tracking
- `docs/dev-feedback-loop.md` — how to iterate on UI cheaply
