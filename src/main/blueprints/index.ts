import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { ipcMain } from 'electron'
import type { BlueprintInfo } from '@shared/types'

interface BlueprintJson {
  id: string
  name: string
  description: string
  icon: string
  scaffolding?: {
    command?: string
    args?: string[]
  }
  mcpConfigs?: Record<string, unknown>
}

let blueprintCache: BlueprintJson[] | null = null

function findBlueprintDir(): string | null {
  // Try built output path, then dev-time project root
  const candidates = [
    path.join(__dirname, '../../blueprints'),
    path.join(__dirname, '../../../blueprints')
  ]
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir
  }
  return null
}

function loadBlueprints(): BlueprintJson[] {
  if (blueprintCache) return blueprintCache

  const blueprintDir = findBlueprintDir()
  if (!blueprintDir) return []

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

// Whitelisted scaffold commands for safety
const ALLOWED_SCAFFOLD_COMMANDS = ['npx', 'npm', 'yarn', 'pnpm', 'bunx']

export function scaffoldProject(blueprintId: string, projectPath: string): Promise<void> {
  return new Promise((resolve) => {
    const blueprint = loadBlueprints().find((bp) => bp.id === blueprintId)
    if (!blueprint) { resolve(); return }

    // Run scaffolding command if defined
    if (blueprint.scaffolding?.command) {
      const parts = blueprint.scaffolding.command.split(/\s+/)
      const cmd = parts[0]

      // Only allow whitelisted commands
      if (!ALLOWED_SCAFFOLD_COMMANDS.includes(cmd)) {
        console.warn(`[Blueprint] Blocked unsafe scaffold command: ${cmd}`)
        resolve()
        return
      }

      const args = parts.slice(1)
      const child = spawn(cmd, args, {
        cwd: projectPath,
        stdio: 'pipe',
        timeout: 120_000
      })

      child.on('exit', () => resolve())
      child.on('error', (err) => {
        console.error(`[Blueprint] Scaffolding failed for ${blueprintId}:`, err)
        resolve()
      })
    } else {
      resolve()
    }

    // Write .mcp.json if blueprint defines MCP configs
    if (blueprint.mcpConfigs && typeof blueprint.mcpConfigs === 'object') {
      const mcpPath = path.join(projectPath, '.mcp.json')
      fs.writeFileSync(mcpPath, JSON.stringify({ mcpServers: blueprint.mcpConfigs }, null, 2))
    }
  })
}

export function registerBlueprintHandlers(): void {
  ipcMain.handle('blueprint:list', async () => {
    return getBlueprintList()
  })
}
