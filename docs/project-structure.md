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
│   └── ios-app.json
│
├── prompts/                     # Runtime Tweeb system prompts
│   ├── pm.md                    # PM Tweeb personality + behavior
│   ├── frontend.md              # Frontend engineer instructions
│   ├── backend.md               # Backend engineer instructions
│   ├── designer.md              # UX/UI designer instructions
│   ├── qa.md                    # QA engineer instructions
│   └── sdet.md                  # SDET instructions
│
├── .claude/
│   └── agents/                  # Dual-purpose: Claude Code dev agents + Tweeb definitions
│       ├── pm.md
│       ├── frontend-engineer.md
│       ├── backend-engineer.md
│       ├── ux-designer.md
│       ├── qa-engineer.md
│       └── sdet.md
│
├── scripts/                     # Onboarding shell scripts
│   ├── detect.sh                # Check installed dependencies
│   ├── install-node.sh          # Install Node via nvm
│   ├── install-gh.sh            # Install GitHub CLI
│   └── install-claude.sh        # Install Claude Code CLI
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
│   └── project-structure.md (this file)
│
└── src/
    ├── main/                    # Electron main process
    │   ├── index.ts             # App entry, window creation
    │   ├── ipc/                 # IPC handler modules
    │   │   ├── agents.ts        # agent:spawn, agent:send, agent:kill
    │   │   ├── projects.ts      # project:create, project:list
    │   │   └── onboarding.ts    # onboard:check, onboard:install
    │   ├── agents/              # Agent engine
    │   │   ├── types.ts         # AgentBackend, AgentProcess interfaces
    │   │   ├── claude.ts        # Claude Code CLI wrapper
    │   │   ├── codex.ts         # OpenAI Codex CLI wrapper
    │   │   └── manager.ts       # TweebManager (lifecycle management)
    │   ├── db/                  # Database
    │   │   ├── index.ts         # DB singleton, init, migrations
    │   │   └── schema.ts        # Table definitions
    │   ├── github/              # GitHub CLI wrapper
    │   │   └── index.ts         # createRepo, cloneRepo, addCollaborator
    │   ├── onboarding/          # Setup and install
    │   │   ├── detect.ts        # Check what's installed
    │   │   └── install.ts       # Run install scripts
    │   ├── blueprints/          # Blueprint engine
    │   │   └── index.ts         # Load, validate, execute blueprints
    │   └── notifications/       # External notifications
    │       ├── sms.ts           # Twilio SMS
    │       └── tts.ts           # Kokoro TTS bridge
    │
    ├── renderer/                # React UI
    │   ├── index.html           # HTML entry point
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
    │   │   │   ├── SubscriptionStep.tsx
    │   │   │   ├── InstallStep.tsx
    │   │   │   ├── AuthStep.tsx
    │   │   │   └── DisclaimerStep.tsx
    │   │   ├── ProjectCreate/   # New project flow
    │   │   │   └── NewProjectView.tsx
    │   │   └── Settings/
    │   │       └── SettingsView.tsx
    │   ├── stores/              # Zustand state management
    │   │   ├── chatStore.ts     # Messages, send/receive
    │   │   ├── boardStore.ts    # Tickets, columns
    │   │   ├── projectStore.ts  # Current project, list
    │   │   └── appStore.ts      # Onboarding state, settings
    │   └── styles/
    │       └── global.css
    │
    ├── shared/                  # Types shared between main + renderer
    │   └── types.ts             # Project, Tweeb, Ticket, Message types
    │
    └── preload/                 # Electron preload scripts
        └── index.ts             # contextBridge API exposure
```

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
| `@anthropic-ai/electron-mcp-server` | Dev feedback loop |

## Dual-Purpose Agent Files

The `.claude/agents/` directory serves two purposes:

1. **Dev-time**: Claude Code picks these up as custom agents when working on TWEEBS. The "frontend-engineer" agent helps Claude Code build TWEEBS' own frontend. The "qa-engineer" agent helps test TWEEBS itself.

2. **Runtime**: The TWEEBS app reads these same files to define Tweeb behavior when spawning worker agents for user projects. The system prompt for each Tweeb role is defined here.

This means improving a Tweeb's behavior (editing its agent file) simultaneously improves both the dev experience and the product.
