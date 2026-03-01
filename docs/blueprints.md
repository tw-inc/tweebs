# Blueprints

A Blueprint is a pre-built template for common project types. It bundles everything needed to start a specific kind of project: the right tools, MCP configs, agent prompts, and initial PM context.

## Blueprint Schema

```json
{
  "id": "personal-website",
  "name": "Build a Personal Website",
  "description": "A modern personal portfolio/blog website",
  "version": "1.0",

  "requirements": {
    "tools": ["node", "git", "gh"],
    "optionalTools": [],
    "blockers": []
  },

  "mcpConfigs": [
    {
      "name": "chrome-devtools",
      "server": "@anthropic-ai/chrome-devtools-mcp",
      "config": {
        "transport": "stdio"
      },
      "note": "Chrome DevTools will open in the background while the FE engineer Tweeb is working. No action required from you."
    }
  ],

  "tweebRoles": ["pm", "designer", "frontend"],

  "initialContext": "The user wants to build a personal website. Start by asking what kind of site (portfolio, blog, landing page), what content they have ready, and any visual preferences. Then create tickets for design → frontend implementation → deployment.",

  "scaffolding": {
    "template": "next-app",
    "commands": [
      "npx create-next-app@latest {project-name} --typescript --tailwind --app",
      "cd {project-name} && npm install"
    ]
  }
}
```

## V1 Blueprints

### Build a Personal Website
- **Roles**: PM, Designer, Frontend Engineer
- **Tools**: Node, Chrome DevTools MCP
- **Stack**: Next.js + Tailwind (scaffolded automatically)
- **Flow**: PM asks about content/style → Designer creates mockups → FE implements
- **User notification**: "You'll see a Chrome DevTools window open in the background while the frontend engineer works. No action needed."

### Build an iOS App
- **Roles**: PM, Designer, Mobile Engineer
- **Tools**: Node, Xcode (blocker if missing)
- **Stack**: SwiftUI (scaffolded via Xcode project template)
- **Flow**: PM asks about app purpose/features → Designer creates UI mockups → Mobile eng implements
- **Blocker**: Xcode must be installed (App Store only, can't auto-install)

## MCP Config Writing

Blueprints write MCP config fragments to `~/.claude/mcp.json`. The engine:

1. Reads existing `~/.claude/mcp.json` (or creates it)
2. Merges the Blueprint's MCP configs into the `mcpServers` object
3. Writes back the file
4. Each Tweeb spawned by this Blueprint gets access to the configured MCP servers

Example merge:
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["@anthropic-ai/chrome-devtools-mcp"],
      "transport": "stdio"
    }
  }
}
```

## Custom Blueprints (Future)

Down the line, users can:
1. Write their own Tweeb role descriptions
2. Define custom tool requirements
3. Bundle it as a Blueprint JSON file
4. Share Blueprints with other users

For V1, we ship the two built-in Blueprints only.
