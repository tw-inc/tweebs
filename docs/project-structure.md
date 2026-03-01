# Project Structure

## Directory Layout

```
tweebs/
├── package.json
├── tsconfig.json
├── electron.vite.config.ts
├── README.md
├── CLAUDE.md
├── LICENSE
│
├── assets/
│   ├── avatars/                 # Tweeb character images
│   │   ├── tweeb-concepts-1.png # Concept art reference
│   │   └── tweeb-concepts-2.png # Concept art reference
│   └── icons/                   # App icons (menu bar, dock, etc.)
│
├── blueprints/                  # Built-in Blueprint definitions
│   ├── personal-website.json
│   ├── ios-app.json
│   ├── chrome-extension.json
│   └── shopify-store.json
│
├── prompts/                     # Runtime Tweeb system prompts
│   ├── pm.md                    # Used when spawning PM for user projects
│   ├── architect.md
│   ├── frontend-engineer.md
│   ├── backend-engineer.md
│   ├── mobile-engineer.md
│   ├── ux-designer.md
│   ├── qa-engineer.md
│   └── sdet.md
│
├── .claude/
│   └── agents/                  # Dev-time Claude Code agents (for building TWEEBS itself)
│       ├── pm.md                # TWEEBS-specific dev coordination
│       ├── architect.md         # TWEEBS architecture decisions
│       ├── frontend-engineer.md # TWEEBS React/Electron UI work
│       ├── backend-engineer.md  # TWEEBS main process/SQLite work
│       ├── mobile-engineer.md
│       ├── ux-designer.md
│       ├── qa-engineer.md
│       └── sdet.md
│
├── scripts/                     # Onboarding shell scripts
│   ├── detect.sh                # Check installed dependencies
│   ├── install-node.sh
│   └── install-claude.sh
│
├── docs/                        # Engineering specs
│   ├── architecture.md
│   ├── agent-engine.md
│   ├── pm-tweeb.md
│   ├── multi-agent.md
│   ├── onboarding.md
│   ├── blueprints.md
│   ├── kanban-board.md
│   ├── database.md
│   ├── notifications-voice.md
│   ├── dev-feedback-loop.md
│   └── project-structure.md     # (this file)
│
└── src/
    ├── main/                    # Electron main process
    │   ├── index.ts             # App entry, window creation
    │   ├── ipc/                 # IPC handler modules
    │   │   ├── agents.ts        # agent:spawn, agent:send, agent:kill
    │   │   ├── projects.ts      # project:create, project:list
    │   │   └── onboarding.ts    # onboard:check, onboard:install
    │   ├── agents/              # Agent engine
    │   │   ├── types.ts         # AgentBackend, AgentProcess, PMCommand interfaces
    │   │   ├── claude.ts        # Claude Code CLI wrapper
    │   │   ├── command-executor.ts  # Parses PM commands, executes actions
    │   │   └── manager.ts       # TweebManager (lifecycle, dispatch)
    │   ├── db/                  # Database
    │   │   ├── index.ts         # DB singleton, init, migrations
    │   │   └── schema.ts        # Table definitions
    │   ├── onboarding/          # Setup and install
    │   │   ├── detect.ts        # Check what's installed
    │   │   └── install.ts       # Run install scripts
    │   ├── blueprints/          # Blueprint engine
    │   │   └── index.ts         # Load, validate, execute blueprints
    │   └── notifications/       # macOS notifications
    │       └── index.ts         # Electron Notification API
    │
    ├── renderer/                # React UI
    │   ├── index.html
    │   ├── main.tsx             # React root
    │   ├── App.tsx              # Router / layout
    │   ├── components/
    │   │   ├── Chat/            # PM conversation
    │   │   │   ├── ChatView.tsx
    │   │   │   ├── MessageBubble.tsx
    │   │   │   └── ChatInput.tsx
    │   │   ├── Board/           # Kanban board
    │   │   │   ├── BoardView.tsx
    │   │   │   ├── Column.tsx
    │   │   │   └── Card.tsx
    │   │   ├── Onboarding/      # Setup wizard
    │   │   │   ├── WelcomeStep.tsx
    │   │   │   ├── InstallStep.tsx
    │   │   │   ├── AuthStep.tsx
    │   │   │   └── DisclaimerStep.tsx
    │   │   ├── ProjectCreate/
    │   │   │   └── NewProjectView.tsx
    │   │   └── Settings/
    │   │       └── SettingsView.tsx
    │   ├── stores/              # Zustand state management
    │   │   ├── chatStore.ts
    │   │   ├── boardStore.ts
    │   │   ├── projectStore.ts
    │   │   └── appStore.ts
    │   └── styles/
    │       └── global.css
    │
    ├── shared/                  # Types shared between main + renderer
    │   └── types.ts
    │
    └── preload/
        └── index.ts             # contextBridge API exposure
```

## Dev-Time vs Runtime Agent Files

These are separate and serve different purposes:

### `.claude/agents/` — Dev-time (building TWEEBS itself)
Claude Code picks these up as custom agents when working on the TWEEBS codebase. They contain TWEEBS-specific instructions:
- The frontend-engineer agent knows about Electron, electron-vite, the project structure
- The architect agent knows about the TWEEBS system design in `docs/`
- The QA agent knows about Vitest, Playwright, and TWEEBS test patterns

### `prompts/` — Runtime (user projects)
These are loaded by the TweebManager when spawning Tweebs for user projects. They contain generic role instructions:
- The frontend-engineer prompt knows how to build React/Next.js/etc. projects in general
- The architect prompt knows how to make technology decisions for arbitrary projects
- The QA prompt knows how to test any codebase

The dev-time agents reference TWEEBS internals. The runtime prompts are project-agnostic.

## Build Tooling

**electron-vite**: Vite-based build tool for Electron. Handles:
- Main process bundling (Node.js target)
- Renderer process bundling (browser target, React)
- Preload script bundling
- Hot module replacement in dev mode
- Production builds with electron-builder

Config: `electron.vite.config.ts`

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `electron` | Desktop app shell |
| `electron-vite` | Build tooling |
| `react`, `react-dom` | UI framework |
| `zustand` | State management |
| `better-sqlite3` | Database |

## User Project Structure (on disk)

When a user creates a project, TWEEBS creates:

```
~/tweebs-projects/{project-name}/
├── .git/                     # Local git (no remote)
├── .tweebs/                  # Coordination layer (hidden from user)
│   ├── tasks/                # Task files (written by Command Executor)
│   ├── progress/             # Progress files (written by worker Tweebs)
│   └── artifacts/            # Cross-Tweeb handoff files
├── .mcp.json                 # Project-level MCP config
├── src/                      # Actual project code
└── ...                       # Scaffolded by blueprint
```
