import { spawn } from 'child_process'

export interface InstallResult {
  success: boolean
  error?: string
}

export async function installDependency(target: string): Promise<InstallResult> {
  switch (target) {
    case 'homebrew':
      return runInstall('/bin/bash', ['-c', '$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)'])
    case 'node':
      return runInstall('brew', ['install', 'node@20'])
    case 'git':
      return runInstall('brew', ['install', 'git'])
    case 'claude':
      return runInstall('npm', ['install', '-g', '@anthropic-ai/claude-code'])
    default:
      return { success: false, error: `Unknown install target: ${target}` }
  }
}

function runInstall(command: string, args: string[]): Promise<InstallResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NONINTERACTIVE: '1' }
    })

    let stderr = ''

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        // Map common errors to plain English
        const friendlyError = mapError(command, stderr)
        resolve({ success: false, error: friendlyError })
      }
    })

    child.on('error', (err) => {
      resolve({ success: false, error: `Couldn't run ${command}: ${err.message}` })
    })

    // Timeout after 5 minutes
    setTimeout(() => {
      if (!child.killed) {
        child.kill()
        resolve({ success: false, error: 'Installation took too long. Please try again.' })
      }
    }, 300000)
  })
}

function mapError(command: string, stderr: string): string {
  if (stderr.includes('Permission denied') || stderr.includes('EACCES')) {
    return 'Permission issue. You may need to enter your password.'
  }
  if (stderr.includes('No such file or directory')) {
    return `${command} is not installed. Please install it first.`
  }
  if (stderr.includes('network') || stderr.includes('ENOTFOUND')) {
    return 'Network error. Check your internet connection and try again.'
  }
  if (stderr.includes('disk space') || stderr.includes('ENOSPC')) {
    return "Not enough disk space. Free up some space and try again."
  }
  return `Installation failed. Error: ${stderr.slice(0, 200)}`
}
