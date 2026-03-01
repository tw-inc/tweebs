import { BrowserWindow } from 'electron'
import { nanoid } from 'nanoid'
import fs from 'fs'
import path from 'path'
import {
  createTicket,
  updateTicket,
  updateProject,
  getTicketsByProject,
  createMessage
} from '../db'
import { tweebManager } from './manager'
import { notifyDecisionNeeded, notifyProjectComplete } from '../notifications'
import type { PMCommand, Ticket, Message } from '@shared/types'

export class CommandExecutor {
  private projectId: string
  private workingDir: string

  constructor(projectId: string, workingDir: string) {
    this.projectId = projectId
    this.workingDir = workingDir
  }

  extractAndExecute(text: string): { visibleText: string; commands: PMCommand[] } {
    const commands: PMCommand[] = []
    let visibleText = text

    // Extract fenced JSON blocks: ```json ... ```
    const jsonBlockRegex = /```json\s*\n([\s\S]*?)```/g
    let match: RegExpExecArray | null

    while ((match = jsonBlockRegex.exec(text)) !== null) {
      const jsonStr = match[1].trim()
      try {
        const parsed = JSON.parse(jsonStr)
        if (parsed && typeof parsed === 'object' && 'cmd' in parsed) {
          commands.push(parsed as PMCommand)
          // Remove the command block from visible text
          visibleText = visibleText.replace(match[0], '')
        }
      } catch {
        console.warn('[CommandExecutor] Failed to parse JSON block:', jsonStr.slice(0, 100))
      }
    }

    // Also try inline JSON (not in fenced blocks) as fallback
    const inlineRegex = /\{[^{}]*"cmd"\s*:\s*"[^"]+?"[^{}]*\}/g
    while ((match = inlineRegex.exec(visibleText)) !== null) {
      try {
        const parsed = JSON.parse(match[0])
        if (parsed.cmd) {
          commands.push(parsed as PMCommand)
          visibleText = visibleText.replace(match[0], '')
        }
      } catch {
        // Not valid JSON, skip
      }
    }

    // Clean up visible text (remove excess whitespace from removed blocks)
    visibleText = visibleText.replace(/\n{3,}/g, '\n\n').trim()

    // Execute all commands
    for (const cmd of commands) {
      this.executeCommand(cmd)
    }

    return { visibleText, commands }
  }

  private executeCommand(cmd: PMCommand): void {
    console.log(`[CommandExecutor] Executing: ${cmd.cmd}`)
    try {
      switch (cmd.cmd) {
        case 'create_ticket':
          this.handleCreateTicket(cmd)
          break
        case 'move_ticket':
          this.handleMoveTicket(cmd)
          break
        case 'spawn_worker':
          this.handleSpawnWorker(cmd)
          break
        case 'kill_worker':
          this.handleKillWorker(cmd)
          break
        case 'message_user':
          this.handleMessageUser(cmd)
          break
        case 'request_decision':
          this.handleRequestDecision(cmd)
          break
        case 'mark_complete':
          this.handleMarkComplete(cmd)
          break
        default:
          console.warn('[CommandExecutor] Unknown command:', (cmd as { cmd: string }).cmd)
      }
    } catch (err) {
      console.error(`[CommandExecutor] Error executing ${cmd.cmd}:`, err)
    }
  }

  private handleCreateTicket(cmd: Extract<PMCommand, { cmd: 'create_ticket' }>): void {
    const now = Date.now()
    const ticket: Ticket = {
      id: nanoid(),
      project_id: this.projectId,
      assigned_tweeb_id: null,
      title: cmd.title,
      description: cmd.description || null,
      column_name: 'backlog',
      priority: getTicketsByProject(this.projectId).length,
      created_at: now,
      updated_at: now
    }
    createTicket(ticket)
    this.sendBoardUpdate()
  }

  private handleMoveTicket(cmd: Extract<PMCommand, { cmd: 'move_ticket' }>): void {
    updateTicket(cmd.ticketId, { column_name: cmd.column })
    this.sendBoardUpdate()
  }

  private handleSpawnWorker(cmd: Extract<PMCommand, { cmd: 'spawn_worker' }>): void {
    // Load role-specific system prompt
    let systemPrompt = `You are a ${cmd.role}. Complete the following task.`
    // Try multiple paths: built output, then dev-time project root
    const candidates = [
      path.join(__dirname, '../../prompts', `${cmd.role}.md`),
      path.join(__dirname, '../../../prompts', `${cmd.role}.md`)
    ]
    for (const promptPath of candidates) {
      if (fs.existsSync(promptPath)) {
        systemPrompt = fs.readFileSync(promptPath, 'utf-8')
        break
      }
    }

    const taskPrompt = `Task: ${cmd.task.title}\n\nDescription: ${cmd.task.description}\n\nAcceptance Criteria:\n${cmd.task.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}`

    tweebManager.spawnWorker(
      this.projectId,
      this.workingDir,
      cmd.role,
      taskPrompt,
      systemPrompt
    )
  }

  private handleKillWorker(cmd: Extract<PMCommand, { cmd: 'kill_worker' }>): void {
    tweebManager.killTweeb(cmd.tweebId)
  }

  private handleMessageUser(cmd: Extract<PMCommand, { cmd: 'message_user' }>): void {
    const msg: Message = {
      id: nanoid(),
      project_id: this.projectId,
      role: 'pm',
      content: cmd.content,
      created_at: Date.now()
    }
    createMessage(msg)
    this.sendToRenderer('chat:message', msg)
  }

  private handleRequestDecision(cmd: Extract<PMCommand, { cmd: 'request_decision' }>): void {
    this.sendToRenderer('decision:request', {
      question: cmd.question,
      options: cmd.options
    })
    notifyDecisionNeeded(cmd.question)
  }

  private handleMarkComplete(cmd: Extract<PMCommand, { cmd: 'mark_complete' }>): void {
    updateProject(this.projectId, { status: 'completed' })

    const msg: Message = {
      id: nanoid(),
      project_id: this.projectId,
      role: 'pm',
      content: cmd.summary,
      created_at: Date.now()
    }
    createMessage(msg)
    this.sendToRenderer('chat:message', msg)
    this.sendToRenderer('project:status', { projectId: this.projectId, status: 'completed' })
    notifyProjectComplete(cmd.summary)
  }

  private sendBoardUpdate(): void {
    const tickets = getTicketsByProject(this.projectId)
    this.sendToRenderer('board:update', tickets)
  }

  private sendToRenderer(channel: string, data: unknown): void {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.webContents.send(channel, data)
    }
  }
}
