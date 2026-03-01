# Blueprints

A Blueprint is a pre-built template for a common project type. It bundles the right dependencies, MCP configs, Tweeb roles, scaffolding commands, and initial PM context so the user goes from "I want to build X" to a working project structure in minutes.

Blueprint definitions live in `blueprints/*.json`.

## V1 Blueprints

| Blueprint | Roles | Extra Dependencies | Blocker? |
|-----------|-------|-------------------|----------|
| **Personal Website** | PM, Architect, Designer, FE | None beyond base | — |
| **iOS App** | PM, Architect, Designer, Mobile | Xcode | Xcode (App Store) |
| **Chrome Extension** | PM, Architect, Designer, FE | Google Chrome | Chrome (manual) |
| **Shopify Store** | PM, Architect, Designer, FE, BE | Shopify CLI, Ruby | Shopify Partners account |

## Blueprint Schema

Every blueprint JSON has these sections:

### `dependencies`
```json
{
  "universal": { "list": ["node", "git", "claude"] },
  "blueprint": [
    {
      "name": "Shopify CLI",
      "check": "which shopify",
      "versionCheck": "shopify version",
      "install": "npm install -g @shopify/cli @shopify/theme",
      "blocker": false
    }
  ]
}
```

Each blueprint dependency has:
- **check**: Shell command to detect if installed (exit 0 = installed)
- **versionCheck**: Command to get the installed version
- **minVersion** (optional): Minimum required version
- **install**: Shell command to install it. `null` if it can't be auto-installed.
- **blocker**: If `true` and missing, the blueprint cannot proceed until the user installs it manually.
- **blockerMessage**: Plain-English message shown when blocked.
- **blockerLink**: URL to help the user install it.

### `authRequirements`
Additional auth steps beyond the base Claude auth from onboarding.
```json
{
  "name": "Shopify Partners Account",
  "required": true,
  "note": "Free to create. Gives you unlimited development stores.",
  "enrollUrl": "https://www.shopify.com/partners",
  "authFlow": ["Create account", "Create dev store", "Run 'shopify auth login'"]
}
```

### `mcpConfigs`
MCP servers scoped to this project. Written to `.mcp.json` in the project directory (NOT the global `~/.claude/mcp.json`).
```json
{
  "name": "chrome-devtools",
  "package": "@anthropic-ai/chrome-devtools-mcp",
  "transport": "stdio",
  "assignTo": ["frontend-engineer"],
  "userNotice": "Chrome will open in the background. No action needed."
}
```

### `tweebRoles`
Which agents to spawn. References system prompts in `prompts/{role}.md`.

### `scaffolding`
Commands to set up the initial project structure.
```json
{
  "stack": "Next.js 15 + Tailwind CSS 4 + TypeScript",
  "commands": ["npx create-next-app@latest {project-name} ..."],
  "postScaffold": ["Remove boilerplate from src/app/page.tsx"]
}
```

### `ticketTemplate`
Pre-defined tickets the PM creates at project start, with dependency ordering.

## Install Automation Flow

When a user picks a Blueprint (or the PM identifies one from the description):

```
Blueprint selected
       │
       ▼
 Check blueprint-specific deps
       │
       ├─ All installed? ──────────────► Continue
       │
       ├─ Missing + auto-installable? ─► Install silently in background
       │                                  "Installing Shopify CLI..."
       │                                  ──► Continue when done
       │
       └─ Missing + blocker? ──────────► Show plain-English blocker
                                          "You need [X]. Here's how: [link]"
                                          [Install it] [Pick different project]
                                          Wait for user ──► Re-check ──► Continue
```

### Auth Automation

```
Blueprint has auth requirements?
       │
       ├─ No ───────────────────────────► Continue
       │
       └─ Yes ──────────────────────────► Check if already authed
                                            │
                                            ├─ Authed ──► Continue
                                            │
                                            └─ Not authed:
                                                 "This needs a [X] account (free)."
                                                 "Create one at [link], then tap Continue."
                                                 Run auth command
                                                 Verify ──► Continue
```

### MCP Config Automation

MCP configs are written to `.mcp.json` in the project directory — never the global `~/.claude/mcp.json`. This prevents TWEEBS from affecting the user's other Claude Code usage (if any).

```
Blueprint has MCP configs?
       │
       ├─ No ──► Continue
       │
       └─ Yes ──► Create/read {project}/.mcp.json
                   Merge new MCP server configs
                   Write file
                   Show user notice if specified
                   ──► Continue
```

### Scaffolding Automation

```
All deps installed, auth complete, MCP configured
       │
       ▼
 Create project directory: ~/tweebs-projects/{project-name}/
       │
       ▼
 git init
       │
       ▼
 Run scaffolding commands (npx create-next-app, etc.)
       │
       ▼
 Create .tweebs/ coordination directories
       │
       ▼
 Run postScaffold steps
       │
       ▼
 Spawn PM Tweeb → PM creates tickets from template → work begins
```

## Custom Blueprints (Future)

Down the line, users can:
1. Write their own Tweeb role descriptions
2. Define custom tool requirements and scaffolding
3. Bundle it as a Blueprint JSON file in `blueprints/`
4. Share Blueprints with the community

V1 ships four built-in Blueprints only.
