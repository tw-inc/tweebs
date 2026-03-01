import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import slugify from 'slugify'
import path from 'path'
import fs from 'fs'
import os from 'os'
import {
  createProject as dbCreateProject,
  getProject,
  listProjects,
  getTicketsByProject,
  getMessagesByProject,
  getTweebsByProject
} from '../db'
import { scaffoldProject } from '../blueprints'
import type { Project } from '@shared/types'

export function registerProjectHandlers(): void {
  ipcMain.handle('project:create', async (_event, name: string, description: string, blueprintId: string) => {
    // Input validation
    if (typeof name !== 'string' || !name.trim()) throw new Error('Project name is required')
    if (name.length > 100) throw new Error('Project name too long')

    const id = nanoid()
    const slug = slugify(name, { lower: true, strict: true })
    let projectPath = path.join(os.homedir(), 'tweebs-projects', slug)

    // Prevent duplicate slug collisions
    if (fs.existsSync(projectPath)) {
      projectPath = `${projectPath}-${nanoid(6)}`
    }

    // Validate resolved path is inside tweebs-projects
    const base = path.join(os.homedir(), 'tweebs-projects')
    if (!path.resolve(projectPath).startsWith(path.resolve(base))) {
      throw new Error('Invalid project path')
    }

    // Create project directory and .tweebs coordination dirs
    fs.mkdirSync(path.join(projectPath, '.tweebs', 'tasks'), { recursive: true })
    fs.mkdirSync(path.join(projectPath, '.tweebs', 'progress'), { recursive: true })
    fs.mkdirSync(path.join(projectPath, '.tweebs', 'artifacts'), { recursive: true })

    // Init local git repo
    const { execSync } = await import('child_process')
    try {
      execSync('git init', { cwd: projectPath, stdio: 'pipe' })
    } catch {
      // Non-fatal if git isn't installed yet (onboarding handles it)
    }

    const now = Date.now()
    const project: Project = {
      id,
      name: name.trim(),
      description: description?.trim() || null,
      blueprint_id: blueprintId || null,
      project_path: projectPath,
      status: 'active',
      pm_session_id: null,
      created_at: now,
      updated_at: now
    }

    dbCreateProject(project)

    // Run blueprint scaffolding if a blueprint was selected
    if (blueprintId) {
      try {
        await scaffoldProject(blueprintId, projectPath)
      } catch (err) {
        console.error('[project:create] Scaffolding error:', err)
      }
    }

    return project
  })

  ipcMain.handle('project:list', async () => {
    return listProjects()
  })

  ipcMain.handle('project:get', async (_event, id: string) => {
    const project = getProject(id)
    if (!project) return null

    const tickets = getTicketsByProject(id)
    const messages = getMessagesByProject(id)
    const tweebs = getTweebsByProject(id)

    return { project, tickets, messages, tweebs }
  })
}
