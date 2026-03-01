import { BrowserWindow } from 'electron'
import { nanoid } from 'nanoid'
import { spawnClaudeAgent, sendToAgent, killAgent } from './claude'
import { createTweeb, updateTweeb, createMessage, updateProject } from '../db'
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

export class TweebManager {
  private agents: Map<string, AgentProcess> = new Map()
  private pmAgents: Map<string, AgentProcess> = new Map() // projectId -> PM agent

  spawnPM(projectId: string, workingDir: string, initialPrompt: string, systemPrompt: string, sessionId?: string): string {
    const tweebId = nanoid()
    const now = Date.now()
    const config = ROLE_CONFIG['pm']

    // Create tweeb record in DB
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

        // Check for session ID in system messages
        if (msg.type === 'system' && msg.content.startsWith('session:')) {
          const sid = msg.content.replace('session:', '')
          updateProject(projectId, { pm_session_id: sid })
          agent.sessionId = sid
        }
      },
      onExit: (code) => {
        // Save accumulated PM response as a message
        if (textAccumulator.trim()) {
          const pmMsg: Message = {
            id: nanoid(),
            project_id: projectId,
            role: 'pm',
            content: textAccumulator.trim(),
            created_at: Date.now()
          }
          createMessage(pmMsg)
          this.sendToRenderer('chat:message', pmMsg)
        }

        updateTweeb(tweebId, { status: code === 0 ? 'idle' : 'error', pid: null })
        this.sendTweebStatus(projectId, tweebId)
        this.pmAgents.delete(projectId)
        this.agents.delete(tweebId)
      }
    })

    // Track PID
    if (agent.process.pid) {
      updateTweeb(tweebId, { pid: agent.process.pid })
    }

    this.agents.set(tweebId, agent)
    this.pmAgents.set(projectId, agent)
    this.sendTweebStatus(projectId, tweebId)

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
    this.sendTweebStatus(projectId, tweebId)

    return tweebId
  }

  killTweeb(tweebId: string): void {
    const agent = this.agents.get(tweebId)
    if (agent) {
      killAgent(agent)
    }
  }

  killAll(): void {
    for (const agent of this.agents.values()) {
      killAgent(agent)
    }
    this.agents.clear()
    this.pmAgents.clear()
  }

  getAgent(tweebId: string): AgentProcess | undefined {
    return this.agents.get(tweebId)
  }

  private handlePMMessage(_projectId: string, _tweebId: string, msg: StreamMessage): void {
    // Phase 6 adds command parsing here
    if (msg.type === 'text') {
      // For now, just log. Phase 6 will parse commands from this text.
      console.log(`[PM] text chunk: ${msg.content.slice(0, 100)}`)
    }
  }

  private sendTweebStatus(projectId: string, tweebId: string): void {
    // Re-read from DB to get latest
    const { getTweebsByProject } = require('../db')
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
