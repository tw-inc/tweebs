# Multi-Agent Coordination

Tweebs don't talk to each other. The PM generates intent via structured commands. The main process executes actions: spawning workers, dispatching tasks, tracking progress. All Tweebs work in the same local project directory.

## Coordination Model

```
     User (Chat UI)
          │
          ▼
       PM Tweeb ──── emits JSON commands ────► Command Executor (main process)
                                                     │
                                          ┌──────────┼──────────┐
                                          ▼          ▼          ▼
                                      SQLite    TweebManager  Progress
                                      (tickets) (spawn/kill)  Poller
                                                     │
                                          ┌──────────┼──────────┐
                                          ▼          ▼          ▼
                                     Architect    Designer   FE Tweeb
                                     (local)     (local)    (local)
                                          │          │          │
                                     progress.json  ...       ...
```

The PM is the brain. The main process is the hands. Workers are specialists that receive tasks and produce output.

## How Tasks Flow

### Step 1: PM breaks down the project
The PM analyzes the user's description and emits `create_ticket` and `spawn_worker` commands. The main process creates tickets in SQLite and spawns worker CLI processes.

### Step 2: Main process dispatches tasks to workers
When the PM emits a `spawn_worker` command, the main process:
1. Creates a new `claude -p` child process
2. Sets the working directory to the project root
3. Loads the system prompt from `prompts/{role}.md`
4. Passes the task description as the prompt
5. Registers the process in SQLite (pid, role, status)

Workers do NOT poll for tasks. The main process sends tasks to them.

### Step 3: Workers do their work
Each worker:
1. Reads the task from its prompt
2. Works in the project directory (reads files, writes code, commits to local git)
3. Writes `.tweebs/progress/{tweeb-id}.json` after each meaningful action
4. Exits when done

### Step 4: Main process tracks progress
The main process polls `.tweebs/progress/*.json` every 5 seconds:
- Status changed → update SQLite → push to renderer → board updates
- Worker exited → mark ticket as done (or error)
- Worker blocked → notify PM (send blocker context to PM's stdin)

### Step 5: PM coordinates handoffs
When a worker finishes, the main process tells the PM. The PM decides what's next — spawn the next worker, ask the user a question, or mark the project complete.

## One Repo Per Project

All Tweebs work in the same local directory. There is no GitHub. There are no remote repos.

```
~/tweebs-projects/my-portfolio/
├── .git/                           # Local git only
├── .tweebs/                        # Coordination layer
│   ├── tasks/                      # Written by PM (via Command Executor)
│   │   ├── designer-001.json
│   │   └── fe-001.json
│   ├── progress/                   # Written by worker Tweebs
│   │   ├── designer-001.json
│   │   └── fe-001.json
│   └── artifacts/                  # Cross-Tweeb handoff files
│       ├── architecture.md         # Written by architect
│       └── design-system.md        # Written by designer
├── .mcp.json                       # Project-level MCP config
├── src/
├── package.json
└── ...
```

Why local-only:
- **Mom test**: The user should never need a GitHub account
- **Simplicity**: No auth flows, no rate limits, no network dependency for core workflow
- **Speed**: No push/pull latency between Tweebs
- Deployment (Vercel, Netlify) can work from local via their CLIs — no GitHub required

## Task File Format

Written by the Command Executor (on behalf of PM) to `.tweebs/tasks/{tweeb-id}.json`:

```json
{
  "taskId": "ticket-abc123",
  "tweebId": "fe-001",
  "role": "frontend-engineer",
  "title": "Build the navigation component",
  "description": "Create a responsive top navigation bar with logo on the left, menu items center, and CTA button right. Use the color palette from .tweebs/artifacts/design-system.md.",
  "acceptanceCriteria": [
    "Nav is responsive down to 375px",
    "Logo links to home",
    "CTA button says 'Get Started'"
  ],
  "context": {
    "relevantFiles": ["src/components/Nav.tsx"],
    "artifacts": [".tweebs/artifacts/design-system.md"]
  },
  "status": "assigned",
  "assignedAt": 1709164800
}
```

## progress.json Format

Written by each worker Tweeb to `.tweebs/progress/{tweeb-id}.json`:

```json
{
  "tweebId": "fe-001",
  "role": "frontend-engineer",
  "status": "working",
  "currentTask": "ticket-abc123",
  "summary": "Building the nav component. Responsive layout done, working on mobile menu.",
  "completedTasks": ["ticket-xyz789"],
  "blockers": [],
  "lastCommit": "a1b2c3d",
  "lastUpdate": 1709165400
}
```

Status values: `working`, `blocked`, `done`, `rate_limited`, `error`

When `status` is `blocked`:
```json
{
  "status": "blocked",
  "blockers": [
    {
      "type": "decision_needed",
      "question": "Should the mobile menu be a hamburger or a bottom sheet?",
      "options": ["hamburger", "bottom sheet"],
      "context": "Both are implemented, need user preference"
    }
  ]
}
```

## Cross-Tweeb Handoffs

Tweebs share work via the `.tweebs/artifacts/` directory and the project source tree. The PM coordinates the order.

Example: Designer → Frontend Engineer

1. PM spawns designer Tweeb with task: "Create visual direction for a portfolio site"
2. Designer works, writes `.tweebs/artifacts/design-system.md` (colors, typography, spacing, component specs)
3. Designer writes progress.json with `status: "done"`
4. Main process detects done → notifies PM
5. PM emits `spawn_worker` for frontend-engineer, with task description referencing `.tweebs/artifacts/design-system.md`
6. Frontend engineer reads the design system file and implements accordingly

The PM includes artifact file paths in the task context so workers know where to find cross-Tweeb output.

### Designer Review Step

Before the frontend engineer starts implementing, the PM surfaces the designer's output to the user:

"The designer came up with this direction: [summary of design-system.md]. Want to proceed or make changes?"

This prevents LLM-to-LLM translation loss — the user approves the design before it gets built.

## Execution Strategy

### Sequential by default
Workers run one at a time to stay within rate limits. Order:
1. Architect (produces architecture doc)
2. Designer (produces design system, references architecture)
3. Implementation Tweebs (FE, BE, mobile — reference both)

### Parallel when budget allows
If rate limit budget has headroom, the architect and designer can run in parallel (they don't depend on each other). Implementation Tweebs always wait for both to finish.

## Scaling Considerations

V1 supports up to ~5 Tweebs per project (PM + architect + designer + 2 implementation). Each worker is a short-lived process — only one or two are active at any time. Rate limits are the binding constraint, not compute.
