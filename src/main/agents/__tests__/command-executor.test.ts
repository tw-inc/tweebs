import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db module
vi.mock('../../db', () => ({
  createTicket: vi.fn((ticket) => ticket),
  updateTicket: vi.fn(),
  updateProject: vi.fn(),
  getTicketsByProject: vi.fn(() => []),
  createMessage: vi.fn((msg) => msg)
}))

// Mock the manager module
vi.mock('../manager', () => ({
  tweebManager: {
    spawnWorker: vi.fn(() => 'mock-tweeb-id'),
    killTweeb: vi.fn()
  }
}))

// Mock notifications
vi.mock('../../notifications', () => ({
  notifyDecisionNeeded: vi.fn(),
  notifyProjectComplete: vi.fn()
}))

// Mock electron — use a persistent spy for window.send
const mockSend = vi.fn()
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [{
      webContents: { send: mockSend }
    }]
  }
}))

import { CommandExecutor } from '../command-executor'
import { createTicket, updateTicket, updateProject, createMessage } from '../../db'
import { tweebManager } from '../manager'

describe('CommandExecutor', () => {
  let executor: CommandExecutor

  beforeEach(() => {
    vi.clearAllMocks()
    executor = new CommandExecutor('proj-1', '/tmp/test-project')
  })

  describe('extractAndExecute', () => {
    it('extracts fenced JSON command blocks', () => {
      const text = `Here's the plan:

\`\`\`json
{"cmd": "create_ticket", "title": "Setup project", "description": "Initialize the project structure"}
\`\`\`

I'll get started right away.`

      const result = executor.extractAndExecute(text)

      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].cmd).toBe('create_ticket')
      expect(result.visibleText).not.toContain('```json')
      expect(result.visibleText).toContain("Here's the plan:")
      expect(result.visibleText).toContain("I'll get started right away.")
      expect(createTicket).toHaveBeenCalledOnce()
    })

    it('extracts multiple commands', () => {
      const text = `\`\`\`json
{"cmd": "create_ticket", "title": "Task 1", "description": "First task"}
\`\`\`
\`\`\`json
{"cmd": "create_ticket", "title": "Task 2", "description": "Second task"}
\`\`\``

      const result = executor.extractAndExecute(text)
      expect(result.commands).toHaveLength(2)
      expect(createTicket).toHaveBeenCalledTimes(2)
    })

    it('extracts inline JSON commands as fallback', () => {
      const text = 'Let me update that: {"cmd": "move_ticket", "ticketId": "abc123", "column": "done"}'

      const result = executor.extractAndExecute(text)
      expect(result.commands).toHaveLength(1)
      expect(result.commands[0].cmd).toBe('move_ticket')
      expect(updateTicket).toHaveBeenCalledWith('abc123', { column_name: 'done' })
    })

    it('returns only visible text after removing commands', () => {
      const text = `Hello user!\n\`\`\`json\n{"cmd": "message_user", "content": "working on it"}\n\`\`\`\nThat's all.`

      const result = executor.extractAndExecute(text)
      expect(result.visibleText).toContain('Hello user!')
      expect(result.visibleText).toContain("That's all.")
      expect(result.visibleText).not.toContain('message_user')
      expect(createMessage).toHaveBeenCalled()
    })

    it('ignores invalid JSON blocks', () => {
      const text = '```json\n{not valid json}\n```'

      const result = executor.extractAndExecute(text)
      expect(result.commands).toHaveLength(0)
    })

    it('ignores JSON blocks without cmd field', () => {
      const text = '```json\n{"key": "value", "foo": "bar"}\n```'

      const result = executor.extractAndExecute(text)
      expect(result.commands).toHaveLength(0)
    })

    it('handles mark_complete command', () => {
      const text = '```json\n{"cmd": "mark_complete", "summary": "All done!"}\n```'

      executor.extractAndExecute(text)
      expect(updateProject).toHaveBeenCalledWith('proj-1', { status: 'completed' })
    })

    it('handles spawn_worker command', () => {
      const text = `\`\`\`json
{"cmd": "spawn_worker", "role": "frontend-engineer", "task": {"title": "Build UI", "description": "Create the main page", "acceptanceCriteria": ["Has a header", "Looks good"]}}
\`\`\``

      executor.extractAndExecute(text)
      expect(tweebManager.spawnWorker).toHaveBeenCalledWith(
        'proj-1',
        '/tmp/test-project',
        'frontend-engineer',
        expect.stringContaining('Build UI'),
        expect.any(String)
      )
    })

    it('handles request_decision command', () => {
      const text = '```json\n{"cmd": "request_decision", "question": "Which framework?", "options": ["React", "Vue"]}\n```'

      executor.extractAndExecute(text)
      expect(mockSend).toHaveBeenCalledWith('decision:request', {
        question: 'Which framework?',
        options: ['React', 'Vue']
      })
    })

    it('handles empty text', () => {
      const result = executor.extractAndExecute('')
      expect(result.commands).toHaveLength(0)
      expect(result.visibleText).toBe('')
    })
  })
})
