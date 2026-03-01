import type { ChildProcess } from 'child_process'
import type { StreamMessage } from '@shared/types'

export interface AgentProcess {
  id: string
  role: string
  process: ChildProcess
  projectId: string
  sessionId?: string
  onMessage?: (msg: StreamMessage) => void
  onExit?: (code: number | null) => void
  onTextChunk?: (text: string) => void
}

export interface SpawnOptions {
  id: string
  role: string
  projectId: string
  workingDir: string
  prompt: string
  systemPrompt?: string
  sessionId?: string
  onMessage?: (msg: StreamMessage) => void
  onExit?: (code: number | null) => void
  onTextChunk?: (text: string) => void
}
