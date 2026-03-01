import { execSync } from 'child_process'

export interface DependencyStatus {
  homebrew: boolean
  node: boolean
  git: boolean
  claudeCode: boolean
  claudeAuth: boolean
}

export function detectDependencies(): DependencyStatus {
  return {
    homebrew: checkCommand('brew --version'),
    node: checkCommand('node --version'),
    git: checkCommand('git --version'),
    claudeCode: checkCommand('claude --version'),
    claudeAuth: checkClaudeAuth()
  }
}

export function getOnboardingStep(deps: DependencyStatus): string {
  if (!deps.homebrew) return 'install-homebrew'
  if (!deps.node) return 'install-node'
  if (!deps.git) return 'install-git'
  if (!deps.claudeCode) return 'install-claude'
  if (!deps.claudeAuth) return 'auth-claude'
  return 'ready'
}

function checkCommand(cmd: string): boolean {
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 10000 })
    return true
  } catch {
    return false
  }
}

function checkClaudeAuth(): boolean {
  try {
    const output = execSync('claude auth status', { stdio: 'pipe', timeout: 10000 }).toString()
    return output.toLowerCase().includes('authenticated') || output.toLowerCase().includes('logged in')
  } catch {
    return false
  }
}
