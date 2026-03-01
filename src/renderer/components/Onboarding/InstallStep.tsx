import { useEffect, useState } from 'react'

interface DepStatus {
  homebrew: boolean
  node: boolean
  git: boolean
  claudeCode: boolean
}

const DEP_LABELS: Record<string, string> = {
  homebrew: 'Homebrew',
  node: 'Node.js',
  git: 'Git',
  claudeCode: 'Claude Code'
}

const DEP_ORDER = ['homebrew', 'node', 'git', 'claudeCode']

export default function InstallStep({ onNext }: { onNext: () => void }) {
  const [deps, setDeps] = useState<DepStatus | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkDeps()
  }, [])

  async function checkDeps() {
    const result = await window.api.onboarding.check()
    setDeps({
      homebrew: result.details.homebrew,
      node: result.details.node,
      git: result.details.git,
      claudeCode: result.details.claudeCode
    })
  }

  useEffect(() => {
    if (deps && Object.values(deps).every(Boolean)) {
      // All installed, auto-advance after a beat
      setTimeout(onNext, 500)
    }
  }, [deps, onNext])

  async function handleInstall(target: string) {
    setInstalling(target)
    setError(null)
    const result = await window.api.onboarding.install(target)
    if (result.success) {
      await checkDeps()
    } else {
      setError(result.error || 'Installation failed')
    }
    setInstalling(null)
  }

  // Find first missing dep
  const nextInstall = deps ? DEP_ORDER.find((d) => !deps[d as keyof DepStatus]) : null

  return (
    <div className="onboarding-step">
      <div className="onboarding-content">
        <h2 className="onboarding-title">Setting things up</h2>
        <p className="onboarding-subtitle">
          Checking what's already installed on your Mac...
        </p>

        {!deps ? (
          <div className="loading-text">Checking...</div>
        ) : (
          <div className="dep-list">
            {DEP_ORDER.map((dep) => (
              <div key={dep} className="dep-item">
                <span className={`dep-icon ${deps[dep as keyof DepStatus] ? 'installed' : ''}`}>
                  {deps[dep as keyof DepStatus] ? '✓' : '○'}
                </span>
                <span className="dep-name">{DEP_LABELS[dep]}</span>
                {deps[dep as keyof DepStatus] && (
                  <span className="dep-status">Installed</span>
                )}
              </div>
            ))}
          </div>
        )}

        {error && <div className="onboarding-error">{error}</div>}

        {nextInstall && (
          <button
            className="onboarding-next-btn"
            onClick={() => handleInstall(nextInstall === 'claudeCode' ? 'claude' : nextInstall)}
            disabled={!!installing}
          >
            {installing ? `Installing ${DEP_LABELS[installing]}...` : `Install ${DEP_LABELS[nextInstall]}`}
          </button>
        )}
      </div>
    </div>
  )
}
