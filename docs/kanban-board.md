# Kanban Board

The board is the ambient view. You're not expected to watch it — you glance at it to see progress. Think of it as the construction site you drive past on your way to work.

## Layout

Three columns:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Backlog    │  │  In Progress │  │     Done     │
│              │  │              │  │              │
│  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │
│  │ Card   │  │  │  │ Card   │  │  │  │ Card   │  │
│  │ 🟢 FE  │  │  │  │ 🔵 PM  │  │  │  │ 🟣 Des│  │
│  └────────┘  │  │  └────────┘  │  │  └────────┘  │
│  ┌────────┐  │  │  ┌────────┐  │  │              │
│  │ Card   │  │  │  │ Card   │  │  │              │
│  │ 🟡 BE  │  │  │  │ 🟢 FE  │  │  │              │
│  └────────┘  │  │  └────────┘  │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Card Anatomy

Each card shows:
- **Ticket title** (2 lines max, truncated)
- **Tweeb avatar** (colored blob matching the Tweeb's role)
- **Tweeb name** (e.g., "Frontend Eng")
- **Status indicator**: subtle animation/glow when actively working, paused icon when rate limited, blocked icon when waiting on a decision
- **Brief status line** from progress.json summary (1 line, e.g., "Building nav component")

## Interactions

The board is **read-only** for users. No drag-and-drop. Tweebs move their own cards:

1. PM creates a ticket → card appears in Backlog
2. PM assigns ticket to a worker → card stays in Backlog with Tweeb avatar
3. Worker starts the task → card moves to In Progress
4. Worker completes the task → card moves to Done

These movements are driven by SQLite ticket status changes, which are driven by progress.json updates.

## Real-Time Updates

1. Main process polls each Tweeb's `progress.json` every 5 seconds
2. If status changed: update SQLite ticket record
3. Emit IPC event `board:update` with changed tickets
4. Zustand board store receives event, re-renders affected cards
5. Column transitions animate (slide card from one column to the next)

## Visual Design

- Dark background, cards are slightly elevated (subtle shadow)
- Tweeb avatars are the round blob characters from the concept art
- Each role has a distinct color: PM=blue, Designer=purple, FE=green, BE=yellow, QA=orange
- Active card has a soft pulsing glow in the Tweeb's color
- Rate-limited cards show a pause icon and dimmed color
- Blocked cards show a warning icon

## Empty States

- New project, no tickets yet: "The PM is breaking down your project..."
- All cards in Done: "All tasks complete!" with a subtle celebration animation
