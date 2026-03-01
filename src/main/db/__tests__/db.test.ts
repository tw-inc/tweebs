import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { SCHEMA } from '../schema'

// Test the DB logic using a direct in-memory SQLite instance
// (avoids requiring Electron's app module)

function createTestDb() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  return db
}

// Column whitelists (same as in db/index.ts)
const PROJECT_COLUMNS = new Set(['name', 'description', 'blueprint_id', 'project_path', 'status', 'pm_session_id'])
const TWEEB_COLUMNS = new Set(['project_id', 'role', 'display_name', 'avatar_color', 'pid', 'status'])
const TICKET_COLUMNS = new Set(['project_id', 'assigned_tweeb_id', 'title', 'description', 'column_name', 'priority'])

function buildSafeUpdate(updates: Record<string, unknown>, allowedColumns: Set<string>) {
  const safeUpdates: Record<string, unknown> = {}
  const parts: string[] = []
  for (const key of Object.keys(updates)) {
    if (key === 'id') continue
    if (!allowedColumns.has(key)) continue
    parts.push(`${key} = @${key}`)
    safeUpdates[key] = updates[key]
  }
  return { fields: parts.join(', '), safeUpdates }
}

describe('Database Schema and Queries', () => {
  let db: Database.Database

  beforeAll(() => {
    db = createTestDb()
  })

  afterAll(() => {
    db.close()
  })

  describe('schema creation', () => {
    it('creates all tables', () => {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[]
      const tableNames = tables.map(t => t.name)
      expect(tableNames).toContain('projects')
      expect(tableNames).toContain('tweebs')
      expect(tableNames).toContain('tickets')
      expect(tableNames).toContain('messages')
      expect(tableNames).toContain('settings')
    })

    it('creates indexes', () => {
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all() as { name: string }[]
      const indexNames = indexes.map(i => i.name)
      expect(indexNames).toContain('idx_tweebs_project')
      expect(indexNames).toContain('idx_tickets_project')
      expect(indexNames).toContain('idx_messages_project')
      expect(indexNames).toContain('idx_messages_created')
    })
  })

  describe('project CRUD', () => {
    const now = Date.now()

    it('creates and retrieves a project', () => {
      db.prepare(`
        INSERT INTO projects (id, name, description, blueprint_id, project_path, status, pm_session_id, created_at, updated_at)
        VALUES (@id, @name, @description, @blueprint_id, @project_path, @status, @pm_session_id, @created_at, @updated_at)
      `).run({
        id: 'proj-1',
        name: 'Test Project',
        description: 'A test project',
        blueprint_id: 'personal-website',
        project_path: '/tmp/test',
        status: 'active',
        pm_session_id: null,
        created_at: now,
        updated_at: now
      })

      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get('proj-1') as Record<string, unknown>
      expect(project.name).toBe('Test Project')
      expect(project.status).toBe('active')
    })

    it('lists projects ordered by updated_at', () => {
      db.prepare(`
        INSERT INTO projects (id, name, description, blueprint_id, project_path, status, pm_session_id, created_at, updated_at)
        VALUES (@id, @name, @description, @blueprint_id, @project_path, @status, @pm_session_id, @created_at, @updated_at)
      `).run({
        id: 'proj-2',
        name: 'Second Project',
        description: null,
        blueprint_id: null,
        project_path: '/tmp/test2',
        status: 'active',
        pm_session_id: null,
        created_at: now + 1000,
        updated_at: now + 1000
      })

      const projects = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as Record<string, unknown>[]
      expect(projects[0].id).toBe('proj-2')
      expect(projects[1].id).toBe('proj-1')
    })

    it('updates project with safe column whitelist', () => {
      const updates = { status: 'completed', pm_session_id: 'sess-123' }
      const { fields, safeUpdates } = buildSafeUpdate(updates, PROJECT_COLUMNS)

      db.prepare(`UPDATE projects SET ${fields}, updated_at = @updated_at WHERE id = @id`).run({
        ...safeUpdates,
        id: 'proj-1',
        updated_at: now + 2000
      })

      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get('proj-1') as Record<string, unknown>
      expect(project.status).toBe('completed')
      expect(project.pm_session_id).toBe('sess-123')
    })
  })

  describe('SQL injection prevention', () => {
    it('rejects unknown column names', () => {
      const malicious = {
        status: 'active',
        "status = 'hacked'; DROP TABLE projects; --": 'x'
      }
      const { fields, safeUpdates } = buildSafeUpdate(malicious, PROJECT_COLUMNS)

      // Only the valid 'status' column should be in the result
      expect(fields).toBe('status = @status')
      expect(Object.keys(safeUpdates)).toEqual(['status'])
    })

    it('rejects empty updates', () => {
      const { fields } = buildSafeUpdate({ id: 'something' }, PROJECT_COLUMNS)
      expect(fields).toBe('')
    })
  })

  describe('tweeb CRUD', () => {
    it('creates and retrieves tweebs by project', () => {
      const now = Date.now()
      db.prepare(`
        INSERT INTO tweebs (id, project_id, role, display_name, avatar_color, pid, status, created_at, updated_at)
        VALUES (@id, @project_id, @role, @display_name, @avatar_color, @pid, @status, @created_at, @updated_at)
      `).run({
        id: 'tweeb-1',
        project_id: 'proj-1',
        role: 'pm',
        display_name: 'PM Tweeb',
        avatar_color: '#a3cbe5',
        pid: null,
        status: 'idle',
        created_at: now,
        updated_at: now
      })

      const tweebs = db.prepare('SELECT * FROM tweebs WHERE project_id = ?').all('proj-1') as Record<string, unknown>[]
      expect(tweebs).toHaveLength(1)
      expect(tweebs[0].role).toBe('pm')
    })
  })

  describe('ticket CRUD', () => {
    it('creates ticket and retrieves by project', () => {
      const now = Date.now()
      db.prepare(`
        INSERT INTO tickets (id, project_id, assigned_tweeb_id, title, description, column_name, priority, created_at, updated_at)
        VALUES (@id, @project_id, @assigned_tweeb_id, @title, @description, @column_name, @priority, @created_at, @updated_at)
      `).run({
        id: 'ticket-1',
        project_id: 'proj-1',
        assigned_tweeb_id: null,
        title: 'Setup project',
        description: 'Initialize repo',
        column_name: 'backlog',
        priority: 0,
        created_at: now,
        updated_at: now
      })

      const tickets = db.prepare('SELECT * FROM tickets WHERE project_id = ? ORDER BY priority ASC').all('proj-1') as Record<string, unknown>[]
      expect(tickets).toHaveLength(1)
      expect(tickets[0].title).toBe('Setup project')
    })

    it('moves ticket between columns', () => {
      const updates = { column_name: 'in_progress' }
      const { fields, safeUpdates } = buildSafeUpdate(updates, TICKET_COLUMNS)

      db.prepare(`UPDATE tickets SET ${fields}, updated_at = @updated_at WHERE id = @id`).run({
        ...safeUpdates,
        id: 'ticket-1',
        updated_at: Date.now()
      })

      const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get('ticket-1') as Record<string, unknown>
      expect(ticket.column_name).toBe('in_progress')
    })
  })

  describe('messages', () => {
    it('creates and retrieves messages in order', () => {
      const now = Date.now()
      for (let i = 0; i < 3; i++) {
        db.prepare(`
          INSERT INTO messages (id, project_id, role, content, created_at)
          VALUES (@id, @project_id, @role, @content, @created_at)
        `).run({
          id: `msg-${i}`,
          project_id: 'proj-1',
          role: i % 2 === 0 ? 'user' : 'pm',
          content: `Message ${i}`,
          created_at: now + i * 1000
        })
      }

      const messages = db.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC').all('proj-1') as Record<string, unknown>[]
      expect(messages).toHaveLength(3)
      expect(messages[0].content).toBe('Message 0')
      expect(messages[2].content).toBe('Message 2')
    })
  })

  describe('settings', () => {
    it('inserts and retrieves settings', () => {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('user_name', 'Test')
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('user_name') as { value: string }
      expect(row.value).toBe('Test')
    })

    it('upserts existing settings', () => {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('user_name', 'Updated')
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('user_name') as { value: string }
      expect(row.value).toBe('Updated')
    })
  })

  describe('foreign key constraints', () => {
    it('prevents ticket with invalid project_id', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO tickets (id, project_id, assigned_tweeb_id, title, description, column_name, priority, created_at, updated_at)
          VALUES ('bad-ticket', 'nonexistent-project', NULL, 'Bad', NULL, 'backlog', 0, 0, 0)
        `).run()
      }).toThrow()
    })
  })
})
