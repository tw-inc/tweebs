import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { SCHEMA } from './schema'
import type { Project, Tweeb, Ticket, Message } from '@shared/types'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'tweebs.db')

  fs.mkdirSync(userDataPath, { recursive: true })

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)

  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

// === Project queries ===

export function createProject(project: Project): Project {
  const db = getDb()
  db.prepare(`
    INSERT INTO projects (id, name, description, blueprint_id, project_path, status, pm_session_id, created_at, updated_at)
    VALUES (@id, @name, @description, @blueprint_id, @project_path, @status, @pm_session_id, @created_at, @updated_at)
  `).run(project)
  return project
}

export function getProject(id: string): Project | undefined {
  return getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined
}

export function listProjects(): Project[] {
  return getDb().prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as Project[]
}

export function updateProject(id: string, updates: Partial<Project>): void {
  const fields = Object.keys(updates)
    .filter((k) => k !== 'id')
    .map((k) => `${k} = @${k}`)
    .join(', ')
  if (!fields) return
  getDb().prepare(`UPDATE projects SET ${fields}, updated_at = @updated_at WHERE id = @id`).run({
    ...updates,
    id,
    updated_at: Date.now()
  })
}

// === Tweeb queries ===

export function createTweeb(tweeb: Tweeb): Tweeb {
  const db = getDb()
  db.prepare(`
    INSERT INTO tweebs (id, project_id, role, display_name, avatar_color, pid, status, created_at, updated_at)
    VALUES (@id, @project_id, @role, @display_name, @avatar_color, @pid, @status, @created_at, @updated_at)
  `).run(tweeb)
  return tweeb
}

export function getTweebsByProject(projectId: string): Tweeb[] {
  return getDb().prepare('SELECT * FROM tweebs WHERE project_id = ?').all(projectId) as Tweeb[]
}

export function updateTweeb(id: string, updates: Partial<Tweeb>): void {
  const fields = Object.keys(updates)
    .filter((k) => k !== 'id')
    .map((k) => `${k} = @${k}`)
    .join(', ')
  if (!fields) return
  getDb().prepare(`UPDATE tweebs SET ${fields}, updated_at = @updated_at WHERE id = @id`).run({
    ...updates,
    id,
    updated_at: Date.now()
  })
}

// === Ticket queries ===

export function createTicket(ticket: Ticket): Ticket {
  const db = getDb()
  db.prepare(`
    INSERT INTO tickets (id, project_id, assigned_tweeb_id, title, description, column_name, priority, created_at, updated_at)
    VALUES (@id, @project_id, @assigned_tweeb_id, @title, @description, @column_name, @priority, @created_at, @updated_at)
  `).run(ticket)
  return ticket
}

export function getTicketsByProject(projectId: string): Ticket[] {
  return getDb().prepare('SELECT * FROM tickets WHERE project_id = ? ORDER BY priority ASC').all(projectId) as Ticket[]
}

export function updateTicket(id: string, updates: Partial<Ticket>): void {
  const fields = Object.keys(updates)
    .filter((k) => k !== 'id')
    .map((k) => `${k} = @${k}`)
    .join(', ')
  if (!fields) return
  getDb().prepare(`UPDATE tickets SET ${fields}, updated_at = @updated_at WHERE id = @id`).run({
    ...updates,
    id,
    updated_at: Date.now()
  })
}

// === Message queries ===

export function createMessage(message: Message): Message {
  const db = getDb()
  db.prepare(`
    INSERT INTO messages (id, project_id, role, content, created_at)
    VALUES (@id, @project_id, @role, @content, @created_at)
  `).run(message)
  return message
}

export function getMessagesByProject(projectId: string): Message[] {
  return getDb().prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC').all(projectId) as Message[]
}

// === Settings queries ===

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}
