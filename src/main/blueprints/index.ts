import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { ipcMain } from 'electron'
import type { BlueprintInfo } from '@shared/types'

interface BlueprintJson {
  id: string
  name: string
  description: string
  icon: string
  scaffolding?: {
    command?: string
  }
  mcpConfigs?: Record<string, unknown>
}

let blueprintCache: BlueprintJson[] | null = null

function loadBlueprints(): BlueprintJson[] {
  if (blueprintCache) return blueprintCache

  const blueprintDir = path.join(process.cwd(), 'blueprints')
  if (!fs.existsSync(blueprintDir)) return []

  const files = fs.readdirSync(blueprintDir).filter((f) => f.endsWith('.json'))
  blueprintCache = files.map((f) => {
    const content = fs.readFileSync(path.join(blueprintDir, f), 'utf-8')
    return JSON.parse(content)
  })

  return blueprintCache!
}

export function getBlueprintList(): BlueprintInfo[] {
  return loadBlueprints().map((bp) => ({
    id: bp.id,
    name: bp.name,
    description: bp.description,
    icon: bp.icon || '📦'
  }))
}

export function scaffoldProject(blueprintId: string, projectPath: string): void {
  const blueprint = loadBlueprints().find((bp) => bp.id === blueprintId)
  if (!blueprint) return

  // Run scaffolding command if defined
  if (blueprint.scaffolding?.command) {
    try {
      execSync(blueprint.scaffolding.command, {
        cwd: projectPath,
        stdio: 'pipe',
        timeout: 120000
      })
    } catch (err) {
      console.error(`[Blueprint] Scaffolding failed for ${blueprintId}:`, err)
    }
  }

  // Write .mcp.json if blueprint defines MCP configs
  if (blueprint.mcpConfigs && Object.keys(blueprint.mcpConfigs).length > 0) {
    const mcpPath = path.join(projectPath, '.mcp.json')
    fs.writeFileSync(mcpPath, JSON.stringify({ mcpServers: blueprint.mcpConfigs }, null, 2))
  }
}

export function registerBlueprintHandlers(): void {
  ipcMain.handle('blueprint:list', async () => {
    return getBlueprintList()
  })
}
