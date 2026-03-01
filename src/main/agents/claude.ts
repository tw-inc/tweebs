import { spawn } from 'child_process'
import type { AgentProcess, SpawnOptions } from './types'
import type { StreamMessage } from '@shared/types'

export function spawnClaudeAgent(options: SpawnOptions): AgentProcess {
  const args = [
    '-p', options.prompt,
    '--output-format', 'stream-json',
    '--dangerously-skip-permissions'
  ]

  if (options.sessionId) {
    args.push('--resume', options.sessionId)
  }

  if (options.systemPrompt) {
    args.push('--system-prompt', options.systemPrompt)
  }

  const child = spawn('claude', args, {
    cwd: options.workingDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  })

  const agent: AgentProcess = {
    id: options.id,
    role: options.role,
    process: child,
    projectId: options.projectId,
    sessionId: options.sessionId,
    onMessage: options.onMessage,
    onExit: options.onExit,
    onTextChunk: options.onTextChunk
  }

  let stdoutBuffer = ''
  let fullText = ''

  child.stdout?.on('data', (data: Buffer) => {
    stdoutBuffer += data.toString()
    const lines = stdoutBuffer.split('\n')
    stdoutBuffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      const msg = parseStreamLine(line)
      if (msg) {
        agent.onMessage?.(msg)
        if (msg.type === 'text') {
          fullText += msg.content
          agent.onTextChunk?.(msg.content)
        }
      }
    }
  })

  child.stderr?.on('data', (data: Buffer) => {
    const text = data.toString()
    console.error(`[claude:${options.id}] stderr:`, text)

    // Check for rate limit signals in stderr
    if (text.toLowerCase().includes('rate') || text.includes('429')) {
      agent.onMessage?.({
        type: 'error',
        content: 'Rate limit detected',
        timestamp: Date.now()
      })
    }
  })

  child.on('exit', (code) => {
    // Flush remaining buffer
    if (stdoutBuffer.trim()) {
      const msg = parseStreamLine(stdoutBuffer)
      if (msg) {
        agent.onMessage?.(msg)
        if (msg.type === 'text') {
          fullText += msg.content
        }
      }
    }
    console.log(`[claude:${options.id}] exited with code ${code}`)
    agent.onExit?.(code)
  })

  return agent
}

export function parseStreamLine(line: string): StreamMessage | null {
  try {
    const parsed = JSON.parse(line)

    // Claude Code stream-json format
    if (parsed.type === 'assistant' && parsed.message) {
      // Full assistant message with content blocks
      const textBlocks = parsed.message.content?.filter(
        (b: { type: string }) => b.type === 'text'
      ) || []
      const text = textBlocks.map((b: { text: string }) => b.text).join('')
      if (text) {
        return { type: 'text', content: text, timestamp: Date.now() }
      }
    }

    if (parsed.type === 'content_block_delta') {
      if (parsed.delta?.type === 'text_delta' && parsed.delta.text) {
        return { type: 'text', content: parsed.delta.text, timestamp: Date.now() }
      }
    }

    if (parsed.type === 'content_block_start') {
      if (parsed.content_block?.type === 'tool_use') {
        return {
          type: 'tool_use',
          content: parsed.content_block.name || 'tool',
          timestamp: Date.now()
        }
      }
    }

    if (parsed.type === 'result') {
      // Final result message — extract session_id if present
      const sessionId = parsed.session_id || parsed.sessionId
      if (sessionId) {
        return { type: 'system', content: `session:${sessionId}`, timestamp: Date.now() }
      }
      // Extract text from result
      if (parsed.result) {
        return { type: 'text', content: parsed.result, timestamp: Date.now() }
      }
    }

    if (parsed.type === 'error') {
      return { type: 'error', content: parsed.error?.message || 'Unknown error', timestamp: Date.now() }
    }

    // Fallback: if it has a text field at the top level
    if (typeof parsed.text === 'string') {
      return { type: 'text', content: parsed.text, timestamp: Date.now() }
    }

    return null
  } catch {
    // Not valid JSON, skip
    return null
  }
}

export function sendToAgent(agent: AgentProcess, message: string): void {
  if (agent.process.stdin?.writable) {
    agent.process.stdin.write(message + '\n')
  }
}

export function killAgent(agent: AgentProcess): void {
  if (!agent.process.killed) {
    agent.process.kill('SIGTERM')
    // Force kill after 5 seconds
    setTimeout(() => {
      if (!agent.process.killed) {
        agent.process.kill('SIGKILL')
      }
    }, 5000)
  }
}
