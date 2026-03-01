# UX Specification

Everything the user sees and touches. No terminal ever visible. Every state has a visual treatment. Every error has a human message.

## Core Principle

The user is not a developer. They don't know what Node.js is, what a terminal is, or what a CLI is. Every word in the UI must be plain English. Every interaction must feel like a consumer app, not a developer tool.

## App Navigation

```
┌────────────────────────────────────────────┐
│  TWEEBS                        [?] [⚙]    │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │         Current View                │   │
│  │    (Onboarding / Home / Project)    │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

- **[?]** = Help (FAQ panel)
- **[⚙]** = Settings
- **TWEEBS** logo = Home (project list)

## Screens

### 1. Onboarding (first run only)
See `docs/onboarding.md`. Four steps: name, subscription, install, auth.

### 2. Home Screen (project list)

```
┌────────────────────────────────────────────┐
│  TWEEBS                        [?] [⚙]    │
│                                             │
│  Your Projects                              │
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ Photography  │  │              │        │
│  │ Portfolio    │  │     [ + ]    │        │
│  │              │  │              │        │
│  │ ✓ Complete   │  │ New Project  │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
└────────────────────────────────────────────┘
```

Each project card shows:
- Project name
- Status: Active (with pulsing dot), Paused, Complete
- Blueprint icon (website, app, extension, store)
- Last updated time

Click a project → enter project view (chat + board).
Click "New Project" → PM spawns, asks what to build.

### 3. Project View (chat + board)

Two-panel layout:

```
┌────────────────────────────────────────────┐
│  ← Photography Portfolio       [?] [⚙]    │
│                                             │
│  ┌──────────────────┐ ┌──────────────────┐ │
│  │    PM Chat       │ │   Kanban Board   │ │
│  │                  │ │                  │ │
│  │  PM: What do you │ │ Backlog | IP | ✓ │ │
│  │  want to build?  │ │                  │ │
│  │                  │ │  [card] [card]   │ │
│  │  You: A photo    │ │  [card]          │ │
│  │  portfolio       │ │                  │ │
│  │                  │ │                  │ │
│  │  ──────────────  │ │                  │ │
│  │  [Type a message]│ │                  │ │
│  └──────────────────┘ └──────────────────┘ │
└────────────────────────────────────────────┘
```

- **← arrow**: Back to Home
- **Chat panel**: Full conversation with PM. Decision prompts appear inline with option buttons.
- **Board panel**: Kanban board (see `docs/kanban-board.md`)
- Chat is the primary interaction. Board is supplementary.

### 4. Settings

Minimal. No technical options.

| Setting | Type | Description |
|---------|------|-------------|
| Your name | Text input | Display name in the app |
| Claude account | Button: "Log in again" | Re-authenticate if needed |
| Notifications | Toggle | macOS notification banners |
| About | Link | Version, license, website |

No phone number (V1). No voice toggle (V1). No model selection. No advanced options.

### 5. Help / FAQ

A slide-out panel triggered by the [?] icon.

**FAQ entries:**
- "What are Tweebs?" → "Tweebs are AI team members that build your project. Each one has a role — designer, engineer, etc. You talk to the PM (project manager) and they coordinate the team."
- "How long does a project take?" → "Most projects take 2-4 hours. Your PM will give you a time estimate when you start."
- "Can I close the app while it's working?" → "Yes! Your PM will keep track of progress and pick up where you left off when you reopen."
- "What does my Claude subscription do?" → "Your Claude subscription powers the AI. TWEEBS uses your subscription to run the team — no extra cost."
- "Can I edit the code myself?" → "Your project files are in a folder on your Mac. If you know how to code, you can open them in any editor."
- "Something went wrong. What do I do?" → "Try restarting the app. If that doesn't help, email help@tweebs.app with the error code shown on screen."

### 6. Decision Prompts (inline in chat)

When the PM needs a decision, it appears as a special message with buttons:

```
┌─────────────────────────────────────────┐
│  PM: The designer came up with two      │
│  options for the menu.                  │
│                                         │
│  ┌───────────────┐ ┌─────────────────┐  │
│  │ Hamburger     │ │ Sidebar         │  │
│  │ menu          │ │ navigation      │  │
│  └───────────────┘ └─────────────────┘  │
│                                         │
│  Or type your own preference...         │
└─────────────────────────────────────────┘
```

Options are buttons, not text the user has to type. Always 2-3 choices. Always an option to type something custom.

## Error Messages — Human Language Only

The user NEVER sees:
- Error codes (EACCES, ENOENT, 401, 429)
- Stack traces or file paths
- Technical jargon (npm, CLI, process, stderr, stdin)
- Raw error messages from any child process

Every error is mapped to plain English:

| Internal Error | User Sees |
|---------------|-----------|
| EACCES | "Need your Mac password to continue." |
| ENOENT | "Something went wrong. Restarting..." (auto-retry) |
| Network timeout | "Can't connect to the internet. Check your connection." |
| Disk full (ENOSPC) | "Your Mac is running low on storage." |
| Auth expired (401) | "Your Claude session expired. Tap to log in again." |
| Rate limit (429) | "Taking a short break. Back in a couple minutes." (shown on card, not as an error) |
| Process crash | "Hit a snag. The PM is looking into it." (PM handles retry) |
| Unknown | "Something went wrong. [Restart] [Email support with code TW-ERR-XXXX]" |

## Chrome / Simulator Windows

Some blueprints open external windows (Chrome for web dev, Simulator for iOS). These are visible to the user but should be framed by the PM:

- Before Chrome opens: PM says "You might see a Chrome window pop up — that's your engineer testing the site. You can ignore it."
- Before Simulator opens: PM says "The iPhone Simulator will open so the engineer can test the app. You can watch if you're curious."

These windows are expected. The PM sets the expectation. The user doesn't panic.

## Responsive / Window Sizing

The TWEEBS window should:
- Default to a comfortable size (~1200x800)
- Be resizable
- On small windows: collapse to chat-only view, board accessible via tab
- Minimum size: 800x600
- Remember window position and size across launches
