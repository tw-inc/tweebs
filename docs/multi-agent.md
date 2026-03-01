# Multi-Agent Coordination

Tweebs don't talk to each other directly. The PM writes task files, workers poll them. Progress is tracked via `progress.json` in each worker's repo.

## Coordination Model

```
            PM Tweeb
           /    |    \
     task file  task file  task file
         |        |         |
     FE Tweeb  BE Tweeb  Designer Tweeb
         |        |         |
   progress.json  progress.json  progress.json
         |        |         |
         └────────┴─────────┘
                  |
           Main Process polls
                  |
            Board updates
```

No direct inter-agent communication. The PM is the hub. Workers are spokes.

## Task File Format

Written by PM to `~/.tweebs/projects/{project-id}/tasks/{tweeb-id}.json`:

```json
{
  "taskId": "ticket-abc123",
  "title": "Build the navigation component",
  "description": "Create a responsive top navigation bar with logo on the left, menu items center, and CTA button right. Use the color palette from the designer's handoff.",
  "acceptanceCriteria": [
    "Nav is responsive down to 375px",
    "Logo links to home",
    "CTA button says 'Get Started'"
  ],
  "context": {
    "designRepo": "tw-user-tweeber/mysite-design",
    "designBranch": "main",
    "relevantFiles": ["src/components/Nav.tsx"]
  },
  "priority": 1,
  "status": "assigned",
  "assignedAt": 1709164800
}
```

## progress.json Format

Written by each worker Tweeb to its repo root:

```json
{
  "tweebId": "fe-tweeb-001",
  "role": "frontend",
  "status": "working",
  "currentTask": "ticket-abc123",
  "summary": "Building the nav component. Responsive layout done, working on mobile menu.",
  "completedTasks": ["ticket-xyz789"],
  "blockers": [],
  "lastCommit": "a1b2c3d",
  "lastUpdate": 1709165400
}
```

Status values: `idle`, `working`, `blocked`, `done`, `rate_limited`

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

## Worker Spawning

When the PM decides to hire workers:

1. PM sends a structured message to TweebManager (via its task output)
2. TweebManager creates a GitHub repo: `gh repo create {username}-tweeber/{project}-{role} --private`
3. TweebManager clones the repo locally
4. TweebManager spawns a CLI process in the cloned repo directory
5. Worker's system prompt is loaded from `.claude/agents/{role}.md`
6. Worker is registered in SQLite with its repo URL, local path, and PID
7. PM writes the first task file for the worker
8. Worker begins polling its task file

## Handoff Between Tweebs

The PM coordinates handoffs. Example: designer → frontend engineer.

1. Designer Tweeb finishes designs, commits to its repo, writes `progress.json` with `status: "done"`
2. PM detects designer is done
3. PM reads the designer's repo to understand what was produced
4. PM writes a task file for FE Tweeb that references the designer's repo and specific files
5. FE Tweeb picks up the task, reads from designer's repo (PM has granted read access)

## Polling Intervals

- Main process polls each Tweeb's `progress.json`: every 5 seconds
- Workers check their task file: every 10 seconds (built into their system prompt instructions)
- Board UI receives updates via IPC events (push from main, not pull from renderer)

## Scaling Considerations

V1 supports up to ~5 concurrent Tweebs per project. Each is a full CLI process. On a Mac with 16GB RAM, this is comfortable. Rate limits are the real constraint, not compute.
