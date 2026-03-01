import { useState } from 'react'

export default function AuthStep({ onNext }: { onNext: () => void }) {
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setChecking(true)
    setError(null)
    const result = await window.api.onboarding.install('auth-claude')
    if (!result.success && result.error) {
      setError(result.error)
    }
    setChecking(false)
  }

  async function handleCheckAuth() {
    setChecking(true)
    const result = await window.api.onboarding.check()
    if (result.details.claudeAuth) {
      onNext()
    } else {
      setError("Not logged in yet. Click 'Log In' to open your browser.")
    }
    setChecking(false)
  }

  return (
    <div className="onboarding-step">
      <div className="onboarding-content">
        <h2 className="onboarding-title">Log in to Claude</h2>
        <p className="onboarding-subtitle">
          Click below to open your browser and log in. Come back here when you're done.
        </p>

        {error && <div className="onboarding-error">{error}</div>}

        <div className="auth-buttons">
          <button
            className="onboarding-next-btn"
            onClick={handleLogin}
            disabled={checking}
          >
            Log In
          </button>
          <button
            className="onboarding-secondary-btn"
            onClick={handleCheckAuth}
            disabled={checking}
          >
            {checking ? 'Checking...' : "I'm logged in"}
          </button>
        </div>
      </div>
    </div>
  )
}
