# Onboarding

First-run experience. Your mom should be able to go from download to working project without touching a terminal, creating any accounts (beyond Claude/ChatGPT), or making any technical decisions.

## Flow

```
Download & Launch
      │
      ▼
  Welcome Screen
  "Pick a username"
      │
      ▼
  Subscription Selection
  ┌─────────────────────────┐
  │ I have Claude Pro/Max   │
  └────────────┬────────────┘
               │
               ▼
         Detect & Install
         (node, git, claude CLI)
         All silent, background,
         progress bar only
               │
               ▼
         Auth: claude auth
         (opens browser, user logs in,
          comes back to app)
               │
               ▼
         Permissions Disclaimer
         (one-time, plain English)
               │
               ▼
         Ready. Show "New Project" button.
```

No GitHub. No terminal. No technical decisions.

## V1: Claude Only

V1 ships with Claude Code CLI as the only backend. The subscription selection screen shows one option. Codex CLI (ChatGPT Plus) is a V2 feature — different streaming format, different flags, different permission model. The `AgentBackend` interface is designed for future backends but only Claude is implemented.

## Dependency Detection

Run at first launch. Everything is auto-installed silently.

| Dependency | Check | Auto-Install | Notes |
|-----------|-------|-------------|-------|
| Homebrew | `which brew` | Install script from brew.sh | Needed for other installs |
| Node.js | `which node && node --version` | `brew install node` | Or via nvm if brew fails |
| Git | `which git` | `xcode-select --install` | macOS prompts for Xcode CLI tools |
| Claude Code | `which claude` | `npm install -g @anthropic-ai/claude-code` | Requires Node |

That's it. Four dependencies. No GitHub CLI. No GitHub account. No Codex.

### Xcode CLI Tools Note
`xcode-select --install` triggers a macOS system dialog. TWEEBS detects this and shows: "macOS is installing some developer tools. This takes a minute. We'll continue when it's done." Then polls until `which git` succeeds.

## Auto-Install Strategy

All installs run in the background. The user sees:
- A clean progress screen with the TWEEBS logo
- "Setting up your workspace..."
- Each step listed with a checkmark when done:
  - ✓ Installing tools
  - ✓ Setting up Claude Code
  - → Waiting for you to log in...
- No terminal output. No error codes. No scrolling logs.

If an install fails:
- Retry once silently
- If still fails: show a plain-English message with a help link
- "Something went wrong installing [tool]. Tap here and we'll help you fix it."
- Don't block the entire setup if a non-critical tool fails

## Auth Flow

### Claude Code Auth
1. TWEEBS runs `claude auth` which opens the user's default browser
2. Browser shows Anthropic login page
3. User logs in with their existing Claude Pro/Max account (the one they pay $20/month for)
4. Browser redirects back, CLI stores the token locally
5. TWEEBS detects auth success by checking `claude auth status`
6. Show checkmark: "✓ Connected to Claude"

The user already has this account — they checked "I have Claude Pro/Max." They're just logging in.

## Permissions Disclaimer

One-time modal after auth, before the "New Project" button appears:

> **Before we start**
>
> TWEEBS uses AI to write and run code on your computer. It works in its own project folders and won't touch your other files.
>
> To work without interruptions, it runs in automatic mode. This means the AI can create files, install packages, and run code without asking permission each time.
>
> [Got it, let's build something]

Plain English. No mention of `--dangerously-skip-permissions`. No technical jargon. Acceptance stored in SQLite settings.

## Blueprint-Specific Dependencies

When a user picks a Blueprint (or the PM selects one), there may be additional dependencies:

| Blueprint | Extra Dependencies | Blocker? |
|-----------|-------------------|----------|
| Personal Website | None | — |
| Chrome Extension | Google Chrome | Yes — manual download |
| iOS App | Xcode | Yes — App Store only |
| Shopify Store | Shopify CLI, Ruby | Auto-install via npm/brew |

Blueprint dependency checks run after project creation, before work starts. Same UX: silent install with progress, blockers shown as plain-English messages with links.

### Blocker UX

When a Blueprint has an un-automatable dependency:

> **One more thing**
>
> To build an iOS app, you need Xcode installed. It's free but can only be installed from the App Store.
>
> [Open App Store] [Choose a different project type]

After the user installs it and comes back, TWEEBS re-checks and continues.

## Re-Onboarding

If a dependency breaks or auth expires:
- Detect on app launch (run checks at startup, takes <2 seconds)
- If everything's fine: go straight to main screen
- If something's broken: show a minimal repair screen
  - "Reconnecting to Claude..." (re-auth)
  - "Fixing a missing tool..." (re-install)
- Automatically repair what it can, only bother the user if it can't
