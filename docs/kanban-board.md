# Kanban Board

The board is the ambient view. You're not expected to watch it — you glance at it to see progress. Think of it as the construction site you drive past on your way to work.

## Layout

Three columns:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Backlog    │  │  In Progress │  │     Done     │
│              │  │              │  │              │
│  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │
│  │ Card   │  │  │  │ Card   │  │  │  │ Card ✓ │  │
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
- **Tweeb avatar** (colored blob matching the role)
- **Tweeb role label** (e.g., "Frontend Engineer" — not "FE Tweeb")
- **Status line** from progress.json summary (1 line, e.g., "Building navigation")
- **Progress indicator**: subtle step counter or mini progress bar when available

## Card States

| State | Visual | Description |
|-------|--------|-------------|
| **Queued** | Ghost/faded card | In Backlog, waiting for dependencies |
| **Starting...** | Pulsing fade-in | Worker being spawned |
| **Working** | Soft pulsing glow in Tweeb's color | Actively building |
| **Rate limited** | Yellow pulse, countdown timer | "Taking a short break (back in ~2 min)" |
| **Blocked** | Orange warning icon | "Waiting for your input" (PM has asked the user) |
| **Done** | Green checkmark, subtle completion flash | Task complete |
| **Error** | Red icon | "Hit a snag — PM is looking into it" |

## Card Click → Detail View

Users can click a card to see more detail. This is NOT a terminal or code view. It's a simplified activity log:

```
┌─────────────────────────────────────┐
│  Build the navigation component     │
│  Frontend Engineer                  │
│  ─────────────────────────────────  │
│  ✓ Created layout structure         │
│  ✓ Added logo and menu items        │
│  → Working on mobile responsive     │
│    Styling the hamburger menu       │
│  ○ CTA button                       │
│  ○ Final polish                     │
│  ─────────────────────────────────  │
│  Started 12 min ago                 │
│                             [Close] │
└─────────────────────────────────────┘
```

The activity log is derived from progress.json summaries and git commit messages. No code is shown. No file paths. Just human-readable descriptions of what's happening.

## Interactions

The board is **read-only**. No drag-and-drop. Tweebs move their own cards:

1. PM creates a ticket → card appears in Backlog (queued state)
2. Worker spawns → card shows "Starting..."
3. Worker begins → card moves to In Progress (working state)
4. Worker finishes → card moves to Done (green checkmark + flash)

These movements are driven by SQLite ticket status changes, which are driven by progress.json updates and worker process exits.

## Real-Time Updates

1. Main process polls each Tweeb's progress.json every 5 seconds
2. If status changed: update SQLite → IPC `board:update` → renderer
3. Zustand board store receives event, re-renders affected cards
4. Column transitions animate (smooth slide from one column to the next)
5. Status line updates in-place (fade transition)

## Loading States

Every moment of waiting has a visible state:

| Moment | What the user sees |
|--------|-------------------|
| PM analyzing project | Chat: typing indicator (three dots). Board: empty with "The PM is planning your project..." |
| PM creating tickets | Cards appear one by one in Backlog with a subtle slide-in animation |
| Worker spawning | Card shows "Starting..." with a subtle pulse |
| Worker working (no recent progress update) | Last known status line stays visible. Never show a blank card. |
| Rate limit pause | Card shows "Taking a short break (back in ~2 min)" with countdown |
| Between workers (sequential) | Board shows completed card, next card starts "Starting..." |
| All work in progress | At least one card is pulsing. The board feels alive. |

## Visual Design

- Dark background, cards are slightly elevated (subtle shadow)
- Tweeb avatars are the round blob characters from the concept art
- Each role has a distinct color: PM=blue, Architect=teal, Designer=purple, FE=green, BE=yellow, QA=orange, Mobile=red
- Active card has a soft pulsing glow in the Tweeb's color
- Rate-limited cards dim slightly with a small timer
- Done cards have a green checkmark that flashes once on completion

## Empty States

- **New project, PM analyzing**: "Your PM is breaking down the project..."
- **All cards in Backlog, first worker spawning**: "Work is about to start..."
- **All cards in Done**: Full celebration (see Completion Experience below)

## Completion Experience

When ALL cards are in Done, this is the most important emotional moment. The user just built something without writing a line of code.

1. **Board**: All cards show green checkmarks. Brief confetti animation across the board.
2. **PM Chat**: "Your photography portfolio is ready."
3. **Big action button** appears in chat: **"Preview Your Website"** (or appropriate per blueprint)
   - For websites: opens `localhost:3000` in browser (npm run dev started silently in background)
   - For iOS: opens the Simulator with the app running
   - For Chrome extension: opens Chrome with the extension loaded
4. **macOS notification**: "TWEEBS — Your project is ready!"
5. **Follow-up prompt**: "Want to put it online? I can deploy it for you." (optional next step, not automatic)
6. **Iteration prompt**: "Happy with it? Or want to change anything?"

The celebration is not subtle. The user accomplished something. Mark the moment.
