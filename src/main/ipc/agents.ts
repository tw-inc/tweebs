import { ipcMain, BrowserWindow } from 'electron'
import { nanoid } from 'nanoid'
import fs from 'fs'
import path from 'path'
import { createMessage, getProject } from '../db'
import { tweebManager } from '../agents/manager'
import type { Message } from '@shared/types'

// Default PM system prompt fallback
const DEFAULT_PM_PROMPT = `You are a project manager AI. You help users build software projects.
Be concise and helpful. When the user describes what they want to build, break it into tasks and explain your plan.`

function loadPMPrompt(): string {
  // Use __dirname to resolve paths relative to the built main process bundle
  const promptPath = path.join(__dirname, '../../prompts', 'pm.md')
  if (fs.existsSync(promptPath)) {
    return fs.readFileSync(promptPath, 'utf-8')
  }
  // Fallback: try project root (dev mode)
  const devPath = path.join(__dirname, '../../../prompts', 'pm.md')
  if (fs.existsSync(devPath)) {
    return fs.readFileSync(devPath, 'utf-8')
  }
  return DEFAULT_PM_PROMPT
}

export function registerAgentHandlers(): void {
  ipcMain.handle('chat:send', async (_event, projectId: string, content: string) => {
    // Validate inputs
    if (typeof projectId !== 'string' || !projectId) return
    if (typeof content !== 'string' || !content) return
    if (content.length > 50_000) return // 50KB max message size

    const now = Date.now()

    // Save user message
    const userMsg: Message = {
      id: nanoid(),
      project_id: projectId,
      role: 'user',
      content,
      created_at: now
    }
    createMessage(userMsg)

    // Send user message back to renderer
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.webContents.send('chat:message', userMsg)
    }

    // Get project info
    const project = getProject(projectId)
    if (!project) return

    // If PM is already running for this project, don't spawn another
    if (tweebManager.isPMRunning(projectId)) {
      console.log(`[agents] PM already running for ${projectId}, queueing message`)
      return
    }

    const systemPrompt = loadPMPrompt()

    // Spawn PM with --resume if session exists
    tweebManager.spawnPM(
      projectId,
      project.project_path,
      content,
      systemPrompt,
      project.pm_session_id || undefined
    )
  })

  ipcMain.handle('decision:respond', async (_event, projectId: string, choice: string) => {
    if (typeof projectId !== 'string' || !projectId) return
    if (typeof choice !== 'string' || !choice) return

    // Save user's decision as a message
    const userMsg: Message = {
      id: nanoid(),
      project_id: projectId,
      role: 'user',
      content: choice,
      created_at: Date.now()
    }
    createMessage(userMsg)

    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.webContents.send('chat:message', userMsg)
    }

    // If PM is running, try stdin. Otherwise respawn with --resume.
    if (tweebManager.isPMRunning(projectId)) {
      tweebManager.sendToPM(projectId, choice)
    } else {
      const project = getProject(projectId)
      if (!project) return
      const systemPrompt = loadPMPrompt()
      tweebManager.spawnPM(
        projectId,
        project.project_path,
        `The user chose: "${choice}"`,
        systemPrompt,
        project.pm_session_id || undefined
      )
    }
  })
}
