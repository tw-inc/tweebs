# TWEEBS

A desktop app that gives you a team of AI engineers. You describe what you want to build. Your team builds it. You never touch a terminal.

## What is TWEEBS?

Every member of your team is a Tweeb — a small AI agent with a role (PM, frontend engineer, backend engineer, designer, QA). You only ever talk to the PM Tweeb. The PM breaks down your idea into tickets, assigns work to the other Tweebs, and comes back to you when it needs a human decision.

You're the CEO. The PM is your only point of contact.

## How it works

1. Download the TWEEBS desktop app
2. Create a username, confirm your Claude Pro/Max or ChatGPT Plus subscription
3. Authenticate once in a guided pane — last time you see anything resembling a terminal
4. Click **New Project**, describe what you want to build
5. The PM Tweeb spawns, hires the right team, and populates a kanban board
6. Tweebs work. The board updates. When the PM needs you, it messages you in plain English

## The Board

Simple kanban — Backlog, In Progress, Done. Each Tweeb's avatar shows what they're currently working on. It's the ambient view. You glance at it if you care to, but you're not expected to watch it.

## Blueprints

Pre-built templates for common project types. A Blueprint bundles the right software installs, MCP configs, and Tweeb agent prompts. V1 ships with:
- **Build a Personal Website**
- **Build an iOS App**

## The PM Tweeb

Grumpy, fast, and extremely good at their job. Communicates in the fewest words possible. Doesn't ask unnecessary questions. Think the contractor who shows up, gets it done right, and doesn't want to chat about it.

## Tech

- Electron app, Mac first
- Wraps Claude Code CLI / OpenAI Codex CLI using your own subscription auth
- No API keys, no extra billing layer
- Each Tweeb is an isolated CLI process with its own GitHub repo
- SQLite locally, no cloud sync
- Open source, MIT License

## Status

Engineering planning phase. See `docs/` for technical specs.

## License

MIT
