# Onboarding

First-run experience. The litmus test: your mom should be able to go from download to working project without ever seeing a terminal window.

**HARD RULE: No terminal WINDOW is ever visible to the user.** All CLI operations run as background child processes with `stdio: 'pipe'`. We can run any command we want — `brew install`, `npm install -g`, `sudo`, whatever. The user never sees stdout/stderr. If we need their password, we show a native-looking input inside the TWEEBS UI and pipe it to stdin.

## Flow

```
Download & Launch
      │
      ▼
  macOS Gatekeeper check (app MUST be code-signed + notarized)
      │
      ▼
  Welcome Screen
  "Pick a name — this is just for the app, no account needed."
      │
      ▼
  "Do you pay for Claude? ($20/month or $100/month)"
  [Yes] [No / I need one → link to claude.ai/pricing]
      │
      ▼
  Silent Background Install (progress screen with checkmarks)
  "Setting up your workspace..."
  ✓ Installing tools        ← Homebrew, Node, Git — all background
  ✓ Setting up Claude Code  ← npm install -g, background
  → Logging you in...       ← opens browser, user logs in
      │
      ▼
  Auth complete
      │
      ▼
  Permissions Disclaimer (plain English)
      │
      ▼
  Ready. "New Project" button.
```

## Code Signing and Notarization — REQUIRED

The app MUST be code-signed and notarized. Without this, macOS Gatekeeper blocks the app and most users click Cancel forever.

- Apple Developer Program ($99/year)
- Signing via `electron-builder` with `identity` config
- Notarization via `notarytool` in CI/CD
- Non-negotiable for a consumer Mac app

## Dependency Installation

Everything runs as a background child process (`child_process.spawn` with `stdio: 'pipe'`). The user sees a progress screen with checkmarks. They never see a terminal.

### Install Order

```
1. Homebrew     → brew.sh install script (background)
2. Node.js      → brew install node (background)
3. Git          → xcode-select --install (native macOS dialog) OR brew install git
4. Claude Code  → npm install -g @anthropic-ai/claude-code (background)
```

### Handling Password Prompts (sudo)

Some installs (Homebrew, Xcode CLI Tools) may need the admin password. We handle this inside the TWEEBS UI:

1. Detect when a background process is waiting for password input (parse stderr for "Password:" prompt, or check if process is blocked on stdin)
2. Show a native-looking password dialog inside the Electron app:
   > "Your Mac needs your password to install some tools. This is the same password you use to log into your Mac."
   > [Password field] [Continue]
3. Pipe the password to the child process's stdin
4. If the password is wrong, show: "That password didn't work. Try again."
5. After 3 failures: "Having trouble? Make sure you're using the password you use to log into your Mac."

This is the same pattern as any Mac app that needs admin privileges — except we own the UI instead of showing a terminal.

### Dependency Detection

| Dependency | Check | Install | Notes |
|-----------|-------|---------|-------|
| Homebrew | `which brew` | curl brew.sh script, pipe to bash (background) | May need password |
| Node.js | `which node && node --version` | `brew install node` (background) | Depends on Homebrew |
| Git | `which git` | `xcode-select --install` (native dialog) | macOS system dialog is fine — it's not a terminal |
| Claude Code | `which claude` | `npm install -g @anthropic-ai/claude-code` (background) | Depends on Node |

### Xcode CLI Tools Note
`xcode-select --install` triggers a native macOS system dialog — this is fine, it's the same dialog users see installing other software. BUT:
- The download can take 5-15 minutes on slow connections
- Show: "Your Mac is downloading some tools. This can take up to 15 minutes — you can grab a coffee."
- Show elapsed time, not a fake progress bar
- Timeout at 20 minutes with: "This is taking longer than expected. Make sure you're connected to the internet."

### Error Handling

Every install failure maps to plain English. The user never sees npm/brew error codes.

| Error | What the user sees |
|-------|-------------------|
| EACCES (permissions) | "Need your Mac password to continue." → show password dialog |
| ENOENT (missing) | "Something went wrong. Restarting setup..." → retry |
| Network timeout | "Can't connect to the internet. Check your connection and try again." |
| Disk full | "Your Mac is running low on storage. Free up some space and try again." |
| Unknown error | "Something went wrong. [Restart setup] [Email help@tweebs.app with code TW-ERR-XXXX]" |

## Auth Flow

### How it works (zero terminal exposure)
1. TWEEBS shows: "We're going to open your browser so you can log into Claude."
2. Spawns `claude auth` as background child process (`stdio: 'pipe'`)
3. Parses stdout for the auth URL
4. If `claude auth` opens the browser itself — great
5. If browser doesn't open within 3 seconds — TWEEBS opens the URL via `Electron.shell.openExternal(authUrl)`
6. User sees Anthropic login page in their normal browser. Logs in. 2FA if needed.
7. Browser shows success page
8. TWEEBS polls `claude auth status` (background) until success
9. Shows: "✓ Connected to Claude"

### Pre-check
Run `claude auth status` BEFORE attempting auth. If already authenticated, skip the entire flow. Many Claude Pro users will already have Claude Code installed.

### Failure handling
- Timeout (2 min): "Having trouble logging in? [Try again] [Get help]"
- Auth rejected: "Login didn't work. Make sure you're using the account you pay for Claude with."
- Network: "Can't connect. Check your internet and try again."

### Auth expiration (mid-project)
When detected in the agent engine:
- Pause all Tweeb processes gracefully
- PM says in chat: "Your Claude session expired. Tap to log in again." (single button)
- Button opens browser, same auth flow
- After re-auth, all processes resume automatically
- Call it "log in again" — never "re-auth" or "repair"

## Permissions Disclaimer

One-time modal after auth:

> **Before we start**
>
> TWEEBS creates project files in its own folder on your Mac. It won't touch your photos, documents, or anything else.
>
> Your AI team works automatically — they create files, write code, and build your project without asking permission each time. Everything stays on your computer.
>
> [Got it, let's build something]

What it does NOT say: `--dangerously-skip-permissions`, "run code", "automatic mode"
What it emphasizes: own folder, won't touch your stuff, stays on your computer

## Subscription Screen

Don't use tier names. Users don't remember if they have "Pro" or "Max."

> **Do you pay for Claude?**
>
> TWEEBS uses your Claude subscription to power your AI team.
>
> [$20/month plan] [$100/month plan] [I don't have one → link to sign up]

## Blueprint-Specific Dependencies

Checked after project creation, before work starts. Same UX: background install, checkmarks, password dialog if needed.

| Blueprint | Extra Deps | Install | Blocker? |
|-----------|-----------|---------|----------|
| Personal Website | None | — | — |
| Chrome Extension | Google Chrome | Can't auto-install | Yes — link to download |
| iOS App | Xcode | Can't auto-install (App Store) | Yes — link to App Store |
| Shopify Store | Shopify CLI | `npm install -g @shopify/cli` (background) | No |
| Shopify Store | Ruby | `brew install ruby` (background) | No |

### Shopify Auth
TWEEBS runs `shopify auth login` as a background child process, extracts the OAuth URL, opens it in the browser. Same pattern as `claude auth`. User never types a command.

### Blocker UX

> **One more thing**
>
> To build an iOS app, you need Xcode installed. It's free from the App Store.
>
> [Open App Store] [Choose a different project]

After install, user comes back, TWEEBS re-checks, continues.

## Re-Onboarding

On every app launch (<2 seconds):
1. Check all dependencies
2. Check auth status
3. If fine: straight to main screen
4. If broken:
   - Auth expired: "Welcome back. Tap to log in again." (opens browser)
   - Tool missing: "Fixing something quick..." (background reinstall)
   - Only bother user if interactive step needed (password, login)

## Error Fallback — Total Failure

> **Setup didn't work**
>
> Here's what to try:
> 1. Restart your Mac and open TWEEBS again
> 2. Make sure you're connected to the internet
> 3. If it still doesn't work, email us at help@tweebs.app
>
> Include this code so we can help: **TW-ERR-A3F2**
>
> [Copy error code] [Restart setup] [Email support]

Error code bundles internal logs so support can diagnose without the user opening a terminal.
