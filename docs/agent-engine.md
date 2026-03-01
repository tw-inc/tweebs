# Agent Engine

The agent engine is the core of TWEEBS. It spawns CLI processes, streams their output, handles errors, and manages lifecycle.

## CLI Wrapping

### Claude Code CLI

```bash
claude -p "your prompt here" \
  --output-format stream-json \
  --dangerously-skip-permissions \
  --model claude-sonnet-4-6
```

Flags:
- `-p` (print mode): non-interactive, accepts prompt as argument or via stdin
- `--output-format stream-json`: newline-delimited JSON (NDJSON) for real-time token streaming
- `--dangerously-skip-permissions`: auto-approves all tool uses without confirmation
- `--model`: specify model (worker Tweebs may use cheaper models)

### OpenAI Codex CLI

```bash
codex --quiet --model gpt-4.1 "your prompt here"
```

Same pattern: spawn as child process, parse stdout stream. The exact flags will match whatever Codex CLI's non-interactive mode supports.

## AgentBackend Interface

```typescript
interface AgentConfig {
  workingDir: string;       // Repo directory for this Tweeb
  systemPrompt: string;     // From .claude/agents/ or prompts/
  model?: string;           // Override default model
  backend: 'claude' | 'codex';
}

interface AgentProcess {
  id: string;
  pid: number;
  send(message: string): Promise<void>;
  onMessage(cb: (msg: StreamMessage) => void): void;
  onError(cb: (err: Error) => void): void;
  onExit(cb: (code: number) => void): void;
  kill(): void;
}

interface StreamMessage {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'system';
  content: string;
  timestamp: number;
}
```

## Streaming Output

Claude Code's `stream-json` format emits NDJSON — one JSON object per line:

```json
{"type":"assistant","message":{"content":[{"type":"text","text":"Working on..."}]}}
{"type":"tool_use","tool":{"name":"Write","input":{"file_path":"..."}}}
{"type":"tool_result","result":"File written successfully"}
```

The engine parses each line, extracts the relevant content, and emits typed `StreamMessage` events.

## Multi-Turn Conversations

For the PM Tweeb, we need multi-turn conversation (user talks back and forth). Two approaches:

**Option A: Session continuity via `--resume`**
Claude Code supports `--resume` to continue a previous session. Each PM conversation is a session that gets resumed with each new user message.

**Option B: Fresh prompt with context**
Accumulate conversation history and send the full context with each prompt. Simpler but more tokens per turn.

Recommendation: Option A (`--resume`) for PM conversations. Option B for worker Tweebs who get a single task prompt.

## Rate Limit Handling

Claude Code and Codex CLIs will hit subscription rate limits. Detection:

1. Parse NDJSON stream for error messages containing "rate limit" or HTTP 429
2. Parse stderr for rate limit warnings
3. Detect process exit with rate-limit-specific codes

Response:
1. Set Tweeb status to `paused` in SQLite
2. Update `progress.json` with `"status": "rate_limited"`
3. Board shows "Paused — waiting for rate limit reset" on the Tweeb's cards
4. Start a timer (rate limits typically reset after a window)
5. Auto-retry at interval until the process succeeds
6. Resume normal operation, update status back to `working`

## Process Lifecycle

```
spawn → idle → working → [paused | blocked | done] → kill
                  ↑            |
                  └────────────┘ (resume)
```

- **spawn**: CLI process created, system prompt loaded
- **idle**: Process alive but no active task
- **working**: Actively processing a prompt
- **paused**: Rate limited, waiting for reset
- **blocked**: Needs human decision (escalated to PM → user)
- **done**: Task complete, can receive new task or be killed
- **kill**: Process terminated, cleanup

## Error Handling

- Process crash: log error, update SQLite status, notify PM Tweeb
- Invalid output: skip malformed NDJSON lines, log warning
- Timeout: if no output for 5 minutes, send heartbeat prompt; if no response, restart process
- Auth expired: detect auth errors, surface re-auth prompt to user via onboarding flow
