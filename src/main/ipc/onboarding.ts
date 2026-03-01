import { ipcMain, shell } from 'electron'
import { detectDependencies, getOnboardingStep } from '../onboarding/detect'
import { installDependency } from '../onboarding/install'

export function registerOnboardingHandlers(): void {
  ipcMain.handle('onboard:check', async () => {
    const deps = detectDependencies()
    const step = getOnboardingStep(deps)
    return { step, details: deps }
  })

  ipcMain.handle('onboard:install', async (_event, target: string) => {
    if (target === 'auth-claude') {
      // Open Claude auth in browser
      try {
        const { execSync } = await import('child_process')
        const output = execSync('claude auth login 2>&1', { stdio: 'pipe', timeout: 5000 }).toString()
        // Look for a URL in the output
        const urlMatch = output.match(/https?:\/\/[^\s]+/)
        if (urlMatch) {
          await shell.openExternal(urlMatch[0])
        }
        return { success: true }
      } catch {
        // Fallback: just tell the user to run it manually
        return { success: false, error: 'Please open Terminal and run: claude auth login' }
      }
    }

    return installDependency(target)
  })
}
