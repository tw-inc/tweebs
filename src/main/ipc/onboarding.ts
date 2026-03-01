import { ipcMain, shell } from 'electron'
import { spawn } from 'child_process'
import { detectDependencies, getOnboardingStep } from '../onboarding/detect'
import { installDependency } from '../onboarding/install'

export function registerOnboardingHandlers(): void {
  ipcMain.handle('onboard:check', async () => {
    const deps = await detectDependencies()
    const step = getOnboardingStep(deps)
    return { step, details: deps }
  })

  ipcMain.handle('onboard:install', async (_event, target: string) => {
    if (target === 'auth-claude') {
      // Open Claude auth in browser (async, don't block main process)
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        const child = spawn('claude', ['auth', 'login'], {
          stdio: 'pipe',
          timeout: 60_000
        })

        let output = ''
        child.stdout?.on('data', (data: Buffer) => {
          output += data.toString()
          // Look for a URL to open in browser
          const urlMatch = output.match(/https?:\/\/[^\s]+/)
          if (urlMatch) {
            shell.openExternal(urlMatch[0])
          }
        })
        child.stderr?.on('data', (data: Buffer) => {
          output += data.toString()
        })
        child.on('exit', () => resolve({ success: true }))
        child.on('error', () => {
          resolve({ success: false, error: 'Could not start Claude auth. Is Claude Code installed?' })
        })
      })
    }

    return installDependency(target)
  })
}
