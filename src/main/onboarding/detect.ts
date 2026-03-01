import { execFile } from 'child_process'

export interface DependencyStatus {
  homebrew: boolean
  node: boolean
  git: boolean
  claudeCode: boolean
  claudeAuth: boolean
}

export async function detectDependencies(): Promise<DependencyStatus> {
  // Run all checks in parallel to avoid blocking the main thread
  const [homebrew, node, git, claudeCode, claudeAuth] = await Promise.all([
    checkCommand('brew', ['--version']),
    checkCommand('node', ['--version']),
    checkCommand('git', ['--version']),
    checkCommand('claude', ['--version']),
    checkClaudeAuth()
  ])
  return { homebrew, node, git, claudeCode, claudeAuth }
}

export function getOnboardingStep(deps: DependencyStatus): string {
  if (!deps.homebrew) return 'install-homebrew'
  if (!deps.node) return 'install-node'
  if (!deps.git) return 'install-git'
  if (!deps.claudeCode) return 'install-claude'
  if (!deps.claudeAuth) return 'auth-claude'
  return 'ready'
}

function checkCommand(cmd: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 10_000 }, (err) => {
      resolve(!err)
    })
  })
}

function checkClaudeAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('claude', ['auth', 'status'], { timeout: 10_000 }, (err, stdout) => {
      if (err) { resolve(false); return }
      const output = stdout.toString().toLowerCase()
      resolve(output.includes('authenticated') || output.includes('logged in'))
    })
  })
}
