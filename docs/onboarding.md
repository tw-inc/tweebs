# Onboarding

First-run experience. The user should go from download to working project with minimal friction. TWEEBS detects what's missing, installs it silently, and asks for auth once.

## Flow

```
Download & Launch
      │
      ▼
  Welcome Screen
  "Create a username"
      │
      ▼
  Subscription Selection
  ┌─────────────────────────┐  ┌──────────────────────────┐
  │ I have Claude Pro/Max   │  │ I have ChatGPT Plus      │
  └────────────┬────────────┘  └────────────┬─────────────┘
               │                             │
               ▼                             ▼
         Detect & Install              Detect & Install
         (node, git, gh,              (node, git, gh,
          claude CLI)                  codex CLI)
               │                             │
               ▼                             ▼
         Auth: claude auth            Auth: codex auth
         Auth: gh auth login          Auth: gh auth login
               │                             │
               └──────────┬─────────────────┘
                          ▼
                 GitHub Account Setup
                 "{username}-tweeber"
                          │
                          ▼
                 Permissions Disclaimer
                 (--dangerously-skip-permissions)
                          │
                          ▼
                 Ready. Show main screen.
```

## Dependency Detection

Run at first launch and whenever a Blueprint requires a tool.

| Dependency | Check Command | Auto-Install Method |
|-----------|--------------|-------------------|
| Node.js | `which node && node --version` | Install via nvm (`curl -o- ... \| bash`) |
| Git | `which git && git --version` | Xcode Command Line Tools (`xcode-select --install`) |
| GitHub CLI | `which gh && gh --version` | Homebrew (`brew install gh`) or direct download |
| Claude Code | `which claude && claude --version` | `npm install -g @anthropic-ai/claude-code` |
| Codex CLI | `which codex && codex --version` | `npm install -g @openai/codex` (or equivalent) |
| Homebrew | `which brew` | Install script from brew.sh (needed for gh) |
| Xcode | `xcode-select -p` | **Cannot auto-install** — App Store only |

## Auto-Install Strategy

All installs run in the background with a progress indicator. The user sees:
- "Setting up your workspace..."
- Progress bar showing which tool is being installed
- No terminal output visible

If an install fails:
- Log the error internally
- Show a human-readable message: "Couldn't install [tool]. Here's what to do: [link]"
- Don't block the entire setup — install what you can, surface what you can't

## Auth Flow

### Claude Code Auth
1. Run `claude auth` which opens a browser for Anthropic login
2. User logs in with their Claude Pro/Max account
3. CLI stores the token locally
4. TWEEBS detects auth success (check `claude auth status`)

### GitHub Auth
1. Run `gh auth login`
2. User authenticates via browser (GitHub OAuth)
3. `gh` stores credentials
4. TWEEBS verifies: `gh auth status`

### GitHub Account Setup
- Create or verify the `{username}-tweeber` GitHub account/org
- This is where all project repos live
- If the account doesn't exist, guide the user through GitHub account creation
- Store the tweeber username in SQLite settings

## Permissions Disclaimer

One-time modal shown after auth, before first project:

> TWEEBS runs AI agents that can read, write, and execute code on your machine. This uses the `--dangerously-skip-permissions` flag, which means agents can perform any action without asking for confirmation.
>
> By continuing, you understand and accept this. All work happens in isolated project directories.
>
> [I understand, let's go]

User must click to proceed. Acceptance stored in SQLite settings.

## Xcode Gate

If user selects the "Build an iOS App" Blueprint:
1. Check `xcode-select -p`
2. If Xcode is not installed:
   - Block the Blueprint
   - Show: "iOS development requires Xcode, which can only be installed from the App Store."
   - Link to App Store Xcode page
   - "Once installed, come back and try again."
3. If Xcode is installed: proceed normally

## Re-Onboarding

If a dependency is uninstalled or auth expires after initial setup:
- Detect on app launch (run checks at startup)
- Show a minimal repair screen: "Something's missing. Fixing it..."
- Re-run only the failed checks, not the full wizard
