# Dev Feedback Loop

TWEEBS is a large app. Claude Code will iterate on the UI extensively. The feedback loop must be cheap (token cost) and fast (iteration speed).

## The Problem

When Claude Code builds UI, it needs to see what it built. Two options:
1. **Desktop screenshots** → vision tokens → expensive ($$$)
2. **Chrome DevTools inspection** → text tokens → cheap

We use option 2.

## Chrome DevTools MCP for Electron

Electron's renderer process IS Chromium. Chrome DevTools Protocol (CDP) works natively with it.

### electron-mcp-server
The `electron-mcp-server` package connects Claude Code to Electron's renderer via CDP:

- **DOM inspection**: Read the full DOM tree as text. Claude sees the structure without vision tokens.
- **CSS inspection**: Read computed styles, layout properties. Debug layout issues from text.
- **Console access**: Read console.log output, errors, warnings.
- **Targeted screenshots**: Take a screenshot of a specific element (not the whole screen). Smaller image = fewer vision tokens when needed.
- **Interaction**: Click elements, type text, navigate — useful for testing flows.

### Setup
Add to the project's MCP config (`.claude/mcp.json` or project-level):

```json
{
  "mcpServers": {
    "electron-devtools": {
      "command": "npx",
      "args": ["@anthropic-ai/electron-mcp-server"],
      "transport": "stdio"
    }
  }
}
```

When developing TWEEBS, the Electron app runs in dev mode (`npm run dev`), and Claude Code connects to it via the MCP server.

### Cost Comparison

| Action | Token Type | Cost Estimate |
|--------|-----------|--------------|
| DOM tree read | Text input | ~500-2000 tokens |
| CSS inspection | Text input | ~200-500 tokens |
| Full desktop screenshot | Vision input | ~1500-3000 tokens |
| Element screenshot | Vision input | ~500-1000 tokens |
| Console output | Text input | ~100-500 tokens |

Text tokens are ~10x cheaper than vision tokens. For iterative UI work (change CSS, check result, adjust, repeat), the savings compound fast.

## Dev Workflow

### UI Iteration Cycle
1. Claude Code edits a React component
2. electron-vite hot-reloads the renderer
3. Claude Code uses Chrome DevTools MCP to inspect the result (DOM + CSS, text tokens)
4. If something looks wrong: adjust and repeat
5. Only take a screenshot when visual verification is truly needed (color, spacing, alignment)

### When to Use Screenshots
- Final visual QA of a completed component
- Color and visual design verification
- Layout issues that DOM/CSS inspection can't catch
- Responsive design testing (viewport-specific rendering)

### When to Use DOM/CSS Inspection
- Verifying component structure (correct elements rendered)
- Debugging layout issues (flexbox/grid properties)
- Checking text content
- Verifying event handlers are attached
- Style computation checks

## Keeping Costs Down at Scale

1. **Default to text inspection**: DOM/CSS first, screenshots only when needed
2. **Use Haiku for simple checks**: If just verifying a change applied, use a cheaper model
3. **Batch changes**: Make multiple edits before inspecting, rather than inspect after every line
4. **Component isolation**: Work on components in isolation (Storybook or similar) before integrating — smaller DOM = fewer tokens
5. **Cache results**: If Claude Code already knows the DOM structure, don't re-read it unless something changed
