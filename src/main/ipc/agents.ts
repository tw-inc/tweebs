import { ipcMain, BrowserWindow } from 'electron'
import { nanoid } from 'nanoid'
import fs from 'fs'
import path from 'path'
import { createMessage, getProject } from '../db'
import { tweebManager } from '../agents/manager'
import type { Message } from '@shared/types'

// Default PM system prompt (Phase 6 will load from prompts/pm.md)
const DEFAULT_PM_PROMPT = `You are a project manager AI. You help users build software projects.
Be concise and helpful. When the user describes what they want to build, break it into tasks and explain your plan.`

export function registerAgentHandlers(): void {
  ipcMain.handle('chat:send', async (_event, projectId: string, content: string) => {
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

    // Load PM system prompt if available
    let systemPrompt = DEFAULT_PM_PROMPT
    const promptPath = path.join(process.cwd(), 'prompts', 'pm.md')
    if (fs.existsSync(promptPath)) {
      systemPrompt = fs.readFileSync(promptPath, 'utf-8')
    }

    // Spawn PM or send message to existing PM
    tweebManager.spawnPM(
      projectId,
      project.project_path,
      content,
      systemPrompt,
      project.pm_session_id || undefined
    )
  })

  ipcMain.handle('decision:respond', async (_event, projectId: string, choice: string) => {
    tweebManager.sendToPM(projectId, choice)
  })
}
