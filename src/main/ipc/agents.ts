import { ipcMain, BrowserWindow } from 'electron'
import { nanoid } from 'nanoid'
import { createMessage } from '../db'
import type { Message } from '@shared/types'

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

    // Mock PM response (Phase 5 replaces this with real CLI)
    setTimeout(() => {
      const pmMsg: Message = {
        id: nanoid(),
        project_id: projectId,
        role: 'pm',
        content: getMockResponse(content),
        created_at: Date.now()
      }
      createMessage(pmMsg)

      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.webContents.send('chat:message', pmMsg)
      }
    }, 800)
  })

  ipcMain.handle('decision:respond', async (_event, _projectId: string, _choice: string) => {
    // Stub — Phase 6 wires this to PM stdin
  })
}

function getMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase()
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hey. I'm your PM. Tell me what you want to build and I'll get the team on it."
  }
  if (lower.includes('website') || lower.includes('portfolio') || lower.includes('site')) {
    return "Got it. I'll scope out a plan for your site. Give me a minute to break this into tickets and assign the team."
  }
  if (lower.includes('app')) {
    return "An app. Sure. Let me figure out the architecture and get tickets created. The team will start shortly."
  }
  return "Noted. Let me think about the best approach and get the team moving on this."
}
