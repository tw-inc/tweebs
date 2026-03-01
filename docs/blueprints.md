# Blueprints

A Blueprint is a pre-built template for a common project type. It bundles the right dependencies, MCP configs, Tweeb roles, scaffolding commands, and initial PM context so the user goes from "I want to build X" to a working project structure in minutes.

Blueprint definitions live in `blueprints/*.json`.

## V1 Blueprints

| Blueprint | Roles | Key Dependencies | Blocker? |
|-----------|-------|------------------|----------|
| **Personal Website** | PM, Architect, Designer, FE | Node (universal) | None |
| **iOS App** | PM, Architect, Designer, Mobile | Xcode | Xcode (App Store only) |
| **Chrome Extension** | PM, Architect, Designer, FE | Chrome browser | Chrome (manual install) |
| **Shopify Store** | PM, Architect, Designer, FE, BE | Shopify CLI, Ruby | Shopify Partners account |

## Blueprint Schema

Every blueprint JSON has these sections:

### `dependencies`
```json
{
  "universal": { "list": ["node", "git", "gh", "claude|codex"] },
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
- **minVersion** (optional): Minimum version required
- **install**: Shell command to install it. `null` if it can't be auto-installed.
- **blocker**: If `true` and missing, the blueprint cannot proceed until the user installs it manually.
- **blockerMessage**: Human-readable message shown when blocked.
- **blockerLink**: URL to help the user install it.

### `authRequirements`
Additional auth steps beyond the base Claude/GitHub auth from onboarding.
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
MCP servers to install for this blueprint's Tweebs.
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
Which agents to spawn. References files in `.claude/agents/`.

### `scaffolding`
Commands to set up the project structure.
```json
{
  "stack": "Next.js 15 + Tailwind CSS 4 + TypeScript",
  "commands": ["npx create-next-app@latest {project-name} ..."],
  "postScaffold": ["Remove boilerplate content from src/app/page.tsx"]
}
```

### `ticketTemplate`
Pre-defined tickets the PM creates at project start, with dependency ordering.

## Install Automation Flow

When a user selects a Blueprint (or the PM identifies one from the project description):

```
Blueprint selected
       │
       ▼
 Check universal deps (already done at onboarding)
       │
       ▼
 Check blueprint-specific deps
       │
       ├─ All installed? ──────────────► Continue
       │
       ├─ Missing + auto-installable? ─► Install silently in background
       │                                  Show progress: "Installing Shopify CLI..."
       │                                  ──► Continue when done
       │
       └─ Missing + blocker? ──────────► Show blocker screen
                                          "You need [X]. Here's how to get it: [link]"
                                          Block until user resolves
                                          ──► Re-check, then Continue
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
                                            └─ Not authed ──► Guide user:
                                                 "This blueprint needs a [X] account."
                                                 "Create one at [link], then click Continue."
                                                 Run auth command (e.g., shopify auth login)
                                                 Verify auth status
                                                 ──► Continue
```

### MCP Config Automation

```
Blueprint has MCP configs?
       │
       ├─ No ───────────────────────────► Continue
       │
       └─ Yes ──────────────────────────► Read ~/.claude/mcp.json
                                          Merge new MCP server configs
                                          Write updated file
                                          Show notice to user if specified
                                          ──► Continue
```

### Scaffolding Automation

```
All deps installed, auth complete, MCP configured
       │
       ▼
 Create project directory
       │
       ▼
 Run scaffolding commands (npm create, etc.)
       │
       ▼
 Run postScaffold steps
       │
       ▼
 Create GitHub repo for each Tweeb role
       │
       ▼
 Spawn Tweebs with blueprint's role list
       │
       ▼
 PM creates tickets from ticketTemplate
       │
       ▼
 Work begins
```

## MCP Config Writing Details

Blueprints write MCP config fragments to `~/.claude/mcp.json`. The engine:

1. Reads existing `~/.claude/mcp.json` (or creates `{ "mcpServers": {} }`)
2. Merges the Blueprint's MCP configs into the `mcpServers` object
3. Does NOT overwrite existing configs with the same name (skip if already present)
4. Writes back the file
5. Each Tweeb assigned to the MCP config gets access to that server

## Custom Blueprints (Future)

Down the line, users can:
1. Write their own Tweeb role descriptions
2. Define custom tool requirements and scaffolding
3. Bundle it as a Blueprint JSON file in `blueprints/`
4. Share Blueprints with other users via the community

For V1, we ship four built-in Blueprints only.
