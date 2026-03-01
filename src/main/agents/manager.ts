import { BrowserWindow } from 'electron'
import { nanoid } from 'nanoid'
import fs from 'fs'
import path from 'path'
import { spawnClaudeAgent, sendToAgent, killAgent } from './claude'
import { CommandExecutor } from './command-executor'
import { createTweeb, updateTweeb, createMessage, updateProject, getTweebsByProject, getProject } from '../db'
import { notifyDecisionNeeded, notifyProjectComplete } from '../notifications'
import type { AgentProcess } from './types'
import type { StreamMessage, Message, Tweeb } from '@shared/types'

const ROLE_CONFIG: Record<string, { displayName: string; avatarColor: string }> = {
  pm: { displayName: 'PM Tweeb', avatarColor: 'blue' },
  architect: { displayName: 'Architect', avatarColor: 'teal' },
  'ux-designer': { displayName: 'Designer', avatarColor: 'purple' },
  'frontend-engineer': { displayName: 'Frontend Dev', avatarColor: 'green' },
  'backend-engineer': { displayName: 'Backend Dev', avatarColor: 'yellow' },
  'mobile-engineer': { displayName: 'Mobile Dev', avatarColor: 'red' },
  'qa-engineer': { displayName: 'QA', avatarColor: 'orange' },
  sdet: { displayName: 'SDET', avatarColor: 'pink' }
}

// Rate limit retry backoff schedule (ms)
const RETRY_DELAYS = [30_000, 60_000, 120_000, 300_000, 600_000]

interface RetryState {
  attempt: number
  timer: NodeJS.Timeout | null
  options: {
    projectId: string
    workingDir: string
    role: string
    taskPrompt: string
    systemPrompt: string
  }
}

export class TweebManager {
  private agents: Map<string, AgentProcess> = new Map()
  private pmAgents: Map<string, AgentProcess> = new Map()
  private retryStates: Map<string, RetryState> = new Map()
  private progressPoller: NodeJS.Timeout | null = null

  isPMRunning(projectId: string): boolean {
    return this.pmAgents.has(projectId)
  }

  spawnPM(projectId: string, workingDir: string, initialPrompt: string, systemPrompt: string, sessionId?: string): string {
    // Don't spawn duplicate PM processes
    if (this.pmAgents.has(projectId)) {
      console.log(`[TweebManager] PM already running for ${projectId}, skipping spawn`)
      return this.pmAgents.get(projectId)!.id
    }

    const tweebId = nanoid()
    const now = Date.now()
    const config = ROLE_CONFIG['pm']

    // Check if a PM tweeb already exists for this project, reuse it
    const existingPMs = getTweebsByProject(projectId).filter((t: Tweeb) => t.role === 'pm')
    if (existingPMs.length > 0) {
      // Update existing PM tweeb instead of creating a new one
      const existingPM = existingPMs[0]
      updateTweeb(existingPM.id, { status: 'working', pid: null })
      // Use existing tweeb ID for tracking
      return this.spawnPMProcess(existingPM.id, projectId, workingDir, initialPrompt, systemPrompt, sessionId)
    }

    const tweeb: Tweeb = {
      id: tweebId,
      project_id: projectId,
      role: 'pm',
      display_name: config.displayName,
      avatar_color: config.avatarColor,
      pid: null,
      status: 'working',
      created_at: now,
      updated_at: now
    }
    createTweeb(tweeb)

    return this.spawnPMProcess(tweebId, projectId, workingDir, initialPrompt, systemPrompt, sessionId)
  }

  private spawnPMProcess(tweebId: string, projectId: string, workingDir: string, initialPrompt: string, systemPrompt: string, sessionId?: string): string {

    let textAccumulator = ''

    const agent = spawnClaudeAgent({
      id: tweebId,
      role: 'pm',
      projectId,
      workingDir,
      prompt: initialPrompt,
      systemPrompt,
      sessionId,
      onTextChunk: (text) => {
        textAccumulator += text
      },
      onMessage: (msg) => {
        this.handlePMMessage(projectId, tweebId, msg)

        if (msg.type === 'system' && msg.content.startsWith('session:')) {
          const sid = msg.content.replace('session:', '')
          updateProject(projectId, { pm_session_id: sid })
          agent.sessionId = sid
        }
      },
      onExit: (code) => {
        if (textAccumulator.trim()) {
          const executor = new CommandExecutor(projectId, workingDir)
          const { visibleText } = executor.extractAndExecute(textAccumulator)

          if (visibleText) {
            const pmMsg: Message = {
              id: nanoid(),
              project_id: projectId,
              role: 'pm',
              content: visibleText,
              created_at: Date.now()
            }
            createMessage(pmMsg)
            this.sendToRenderer('chat:message', pmMsg)
          }
        }

        updateTweeb(tweebId, { status: code === 0 ? 'idle' : 'error', pid: null })
        this.sendTweebStatus(projectId, tweebId)
        this.pmAgents.delete(projectId)
        this.agents.delete(tweebId)
      }
    })

    if (agent.process.pid) {
      updateTweeb(tweebId, { pid: agent.process.pid })
    }

    this.agents.set(tweebId, agent)
    this.pmAgents.set(projectId, agent)
    this.sendTweebStatus(projectId, tweebId)
    this.startProgressPoller()

    return tweebId
  }

  sendToPM(projectId: string, message: string): void {
    const pmAgent = this.pmAgents.get(projectId)
    if (pmAgent) {
      sendToAgent(pmAgent, message)
    }
  }

  spawnWorker(projectId: string, workingDir: string, role: string, taskPrompt: string, systemPrompt: string): string {
    const tweebId = nanoid()
    const now = Date.now()
    const config = ROLE_CONFIG[role] || { displayName: role, avatarColor: 'blue' }

    const tweeb: Tweeb = {
      id: tweebId,
      project_id: projectId,
      role,
      display_name: config.displayName,
      avatar_color: config.avatarColor,
      pid: null,
      status: 'working',
      created_at: now,
      updated_at: now
    }
    createTweeb(tweeb)

    let rateLimited = false

    const agent = spawnClaudeAgent({
      id: tweebId,
      role,
      projectId,
      workingDir,
      prompt: taskPrompt,
      systemPrompt,
      onMessage: (msg) => {
        if (msg.type === 'error' && msg.content.includes('Rate limit')) {
          rateLimited = true
          updateTweeb(tweebId, { status: 'rate_limited' })
          this.sendTweebStatus(projectId, tweebId)
        }
      },
      onExit: (code) => {
        this.agents.delete(tweebId)

        // Only retry on rate limit, not other errors
        if (rateLimited) {
          const existing = this.retryStates.get(tweebId)
          const attempt = existing ? existing.attempt + 1 : 0

          if (attempt < RETRY_DELAYS.length) {
            const delay = RETRY_DELAYS[attempt]
            console.log(`[TweebManager] Retrying ${tweebId} in ${delay / 1000}s (attempt ${attempt + 1})`)

            updateTweeb(tweebId, { status: 'rate_limited' })
            this.sendTweebStatus(projectId, tweebId)

            const timer = setTimeout(() => {
              this.retryStates.delete(tweebId)
              // Re-spawn with same params
              this.agents.delete(tweebId)
              this.spawnWorkerRetry(tweebId, projectId, workingDir, role, taskPrompt, systemPrompt, attempt)
            }, delay)

            this.retryStates.set(tweebId, {
              attempt,
              timer,
              options: { projectId, workingDir, role, taskPrompt, systemPrompt }
            })
          } else {
            // Max retries exhausted
            updateTweeb(tweebId, { status: 'error', pid: null })
            this.sendTweebStatus(projectId, tweebId)
          }
        } else {
          updateTweeb(tweebId, { status: 'done', pid: null })
          this.sendTweebStatus(projectId, tweebId)
        }
      }
    })

    if (agent.process.pid) {
      updateTweeb(tweebId, { pid: agent.process.pid })
    }

    this.agents.set(tweebId, agent)
    this.sendTweebStatus(projectId, tweebId)

    return tweebId
  }

  private spawnWorkerRetry(tweebId: string, projectId: string, workingDir: string, role: string, taskPrompt: string, systemPrompt: string, _attempt: number): void {
    updateTweeb(tweebId, { status: 'working' })
    this.sendTweebStatus(projectId, tweebId)

    const agent = spawnClaudeAgent({
      id: tweebId,
      role,
      projectId,
      workingDir,
      prompt: taskPrompt,
      systemPrompt,
      onMessage: (msg) => {
        if (msg.type === 'error' && msg.content.includes('Rate limit')) {
          updateTweeb(tweebId, { status: 'rate_limited' })
          this.sendTweebStatus(projectId, tweebId)
        }
      },
      onExit: (code) => {
        updateTweeb(tweebId, {
          status: code === 0 ? 'done' : 'error',
          pid: null
        })
        this.sendTweebStatus(projectId, tweebId)
        this.agents.delete(tweebId)
      }
    })

    if (agent.process.pid) {
      updateTweeb(tweebId, { pid: agent.process.pid })
    }

    this.agents.set(tweebId, agent)
  }

  killTweeb(tweebId: string): void {
    const agent = this.agents.get(tweebId)
    if (agent) {
      killAgent(agent)
    }
    // Cancel any pending retry
    const retry = this.retryStates.get(tweebId)
    if (retry?.timer) {
      clearTimeout(retry.timer)
      this.retryStates.delete(tweebId)
    }
  }

  killAll(): void {
    // Stop progress poller
    if (this.progressPoller) {
      clearInterval(this.progressPoller)
      this.progressPoller = null
    }
    // Cancel all retries
    for (const [id, retry] of this.retryStates.entries()) {
      if (retry.timer) clearTimeout(retry.timer)
      this.retryStates.delete(id)
    }
    // Kill all agents
    for (const agent of this.agents.values()) {
      killAgent(agent)
    }
    this.agents.clear()
    this.pmAgents.clear()
  }

  getAgent(tweebId: string): AgentProcess | undefined {
    return this.agents.get(tweebId)
  }

  // === Progress Polling ===

  private startProgressPoller(): void {
    if (this.progressPoller) return

    this.progressPoller = setInterval(() => {
      this.pollProgress()
    }, 5000)
  }

  private pollProgress(): void {
    // Check each active agent's project for progress files
    const projectIds = new Set<string>()
    for (const agent of this.agents.values()) {
      projectIds.add(agent.projectId)
    }

    for (const projectId of projectIds) {
      // Find project working dir from any agent
      const agent = Array.from(this.agents.values()).find((a) => a.projectId === projectId)
      if (!agent) continue

      // Read progress files from .tweebs/progress/
      const project = getProject(projectId)
      if (!project) continue

      const progressDir = path.join(project.project_path, '.tweebs', 'progress')
      if (!fs.existsSync(progressDir)) continue

      try {
        const files = fs.readdirSync(progressDir).filter((f: string) => f.endsWith('.json'))
        for (const file of files) {
          const content = fs.readFileSync(path.join(progressDir, file), 'utf-8')
          try {
            const progress = JSON.parse(content)
            if (progress.tweebId && progress.status) {
              const currentTweeb = getTweebsByProject(projectId).find((t: Tweeb) => t.id === progress.tweebId)
              if (currentTweeb && currentTweeb.status !== progress.status) {
                updateTweeb(progress.tweebId, { status: progress.status })
                this.sendTweebStatus(projectId, progress.tweebId)
              }
            }
          } catch {
            // Invalid progress file, skip
          }
        }
      } catch {
        // Progress dir read error, skip
      }
    }

    // Stop polling if no active agents
    if (this.agents.size === 0 && this.progressPoller) {
      clearInterval(this.progressPoller)
      this.progressPoller = null
    }
  }

  // === Internal ===

  private handlePMMessage(_projectId: string, _tweebId: string, msg: StreamMessage): void {
    if (msg.type === 'text') {
      console.log(`[PM] text chunk: ${msg.content.slice(0, 100)}`)
    }
  }

  private sendTweebStatus(projectId: string, tweebId: string): void {
    const tweebs = getTweebsByProject(projectId)
    const tweeb = tweebs.find((t: Tweeb) => t.id === tweebId)
    if (tweeb) {
      this.sendToRenderer('tweeb:status', tweeb)
    }
  }

  private sendToRenderer(channel: string, data: unknown): void {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.webContents.send(channel, data)
    }
  }
}

// Singleton
export const tweebManager = new TweebManager()
