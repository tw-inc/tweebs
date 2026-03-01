# Agent Engine

The agent engine is the core of TWEEBS. It spawns Claude Code CLI processes, streams their output, parses PM commands, dispatches tasks to workers, and manages lifecycle.

## CLI Wrapping

### Claude Code CLI (V1 — only backend)

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
- `--model`: specify model (worker Tweebs may use cheaper models like Haiku)
- `--resume {session-id}`: continue a previous session (used for PM multi-turn)

### Codex CLI (Future — V2+)

The `AgentBackend` interface is designed so a Codex backend can slot in later. V1 ships Claude-only. Codex CLI's non-interactive mode, streaming format, and permission model differ from Claude Code and need separate implementation work.

## AgentBackend Interface

```typescript
interface AgentConfig {
  workingDir: string;         // Project directory
  systemPrompt: string;       // From prompts/{role}.md
  model?: string;             // Override default model
  sessionId?: string;         // For resuming PM sessions
}

interface AgentProcess {
  id: string;
  pid: number;
  role: string;
  send(message: string): Promise<void>;  // Write to stdin
  onMessage(cb: (msg: StreamMessage) => void): void;
  onCommand(cb: (cmd: PMCommand) => void): void;  // PM only
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

## Two Process Models

### PM Tweeb: Long-lived session

The PM is a persistent conversation. The user talks to it across the lifetime of the project.

**Session resumption via `--resume`:**
```bash
# First message
claude -p "What do you want to build?" --output-format stream-json --dangerously-skip-permissions
# Returns a session_id in the output

# Subsequent messages
claude -p "I want a portfolio site" --resume {session-id} --output-format stream-json --dangerously-skip-permissions
```

**CRITICAL: This must be verified before implementation.** If `--resume` with `-p` and `--output-format stream-json` doesn't work for multi-turn, fall back to Option B: accumulate full conversation history and send as a single prompt each turn. This costs more tokens but is guaranteed to work.

### Worker Tweebs: One process per task

Workers are short-lived. The main process spawns a new `claude -p` process for each task:

1. Main process receives `spawn_worker` command from PM
2. Spawns `claude -p` with the task as the prompt and the system prompt from `prompts/{role}.md`
3. Worker does its work in the project directory
4. Worker writes `.tweebs/progress/{tweeb-id}.json` as it works
5. Worker exits when done
6. Main process detects exit, updates ticket status

If a worker needs multiple interactions (rare — most tasks are self-contained), the main process can send follow-up messages to stdin before the process exits.

## Streaming Output

Claude Code's `stream-json` format emits NDJSON — one JSON object per line:

```json
{"type":"assistant","message":{"content":[{"type":"text","text":"Working on..."}]}}
{"type":"tool_use","tool":{"name":"Write","input":{"file_path":"..."}}}
{"type":"tool_result","result":"File written successfully"}
```

The engine parses each line and:
1. For PM Tweebs: scans for fenced JSON command blocks → emits to Command Executor
2. For all Tweebs: extracts text content → emits as StreamMessage events
3. Detects tool use → updates progress tracking
4. Detects errors → triggers error handling

## PM Command Parsing

The PM's system prompt instructs it to emit structured commands as fenced JSON blocks. The Command Executor in the main process:

1. Buffers the NDJSON stream
2. Detects JSON blocks matching the PMCommand schema
3. Validates each command
4. Executes: create tickets in SQLite, spawn workers via TweebManager, update board state
5. Strips command blocks from the user-visible chat stream
6. Passes `message_user` content to the renderer as chat messages

Invalid or malformed commands are logged and skipped — they don't crash the system.

## Rate Limit Handling

### Detection
1. Parse NDJSON stream for error messages containing "rate limit" or HTTP 429
2. Parse stderr for rate limit warnings
3. Detect process exit with rate-limit-specific codes

### Response
1. Set Tweeb status to `rate_limited` in SQLite
2. Update board card: "Paused — rate limit, resuming automatically"
3. Start exponential backoff timer (30s, 1m, 2m, 5m, 10m)
4. Auto-retry at each interval until success
5. Resume normal operation, update status back to `working`

### Rate Limit Budget (pre-flight estimation)

Before spawning workers, the main process estimates token/message usage:

```typescript
interface RateBudget {
  estimatedMessagesPerTweeb: number;  // Based on blueprint complexity
  activeTweebs: number;
  subscriptionLimit: number;          // Messages per time window
  windowMinutes: number;
  willHitLimit: boolean;
  estimatedCompletionTime: string;    // "~2 hours with rate limit pauses"
}
```

If the budget suggests heavy rate limiting, the PM informs the user upfront:
"This project will take a few hours with your subscription. I'll work through rate limit pauses automatically — you don't need to do anything."

Sequential worker execution (one at a time) is the default. Parallel execution is only used when rate budget allows it.

## Process Lifecycle

```
spawn → working → [rate_limited | blocked | done | error]
                       |            |
                       └──► working ◄┘ (resume)
```

Worker Tweebs:
- **spawn**: CLI process created with task prompt
- **working**: Actively processing
- **rate_limited**: Paused, auto-retry timer running
- **blocked**: Needs human decision (escalated via PM)
- **done**: Task complete, process exits
- **error**: Process crashed or timed out

PM Tweeb:
- Stays alive across the project (session resumption)
- Only killed when project is archived or app closes

## Error Handling

- **Process crash**: Log error, update SQLite status, notify PM Tweeb (send error context to PM's stdin). PM decides whether to retry the task or escalate.
- **Invalid output**: Skip malformed NDJSON lines, log warning. Never crash the parser.
- **Timeout**: If no output for 5 minutes, send a heartbeat check. If no response after 30 more seconds, kill and restart the process with the same task.
- **Auth expired**: Detect auth errors in stream, surface re-auth prompt to user via the onboarding repair flow.
- **Invalid PM commands**: Log and skip. The system continues — one bad command doesn't break the pipeline.
