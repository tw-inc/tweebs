import { useState, useEffect } from 'react'

export default function SettingsView({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.settings.get('user_name').then((val) => {
      if (val) setName(val)
    })
  }, [])

  async function handleSaveName() {
    await window.api.settings.set('user_name', name.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleReAuth() {
    await window.api.onboarding.install('auth-claude')
  }

  return (
    <div className="settings-view">
      <div className="settings-header drag-region">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>Settings</h2>
      </div>

      <div className="settings-body">
        <div className="settings-section">
          <h3>Profile</h3>
          <div className="settings-row">
            <label>Your name</label>
            <div className="settings-input-row">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
              />
              <button className="settings-save-btn" onClick={handleSaveName}>
                {saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Claude Account</h3>
          <div className="settings-row">
            <label>Re-authenticate with Claude</label>
            <button className="settings-action-btn" onClick={handleReAuth}>
              Log In Again
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>About</h3>
          <div className="settings-row">
            <label>TWEEBS v0.1.0</label>
            <span className="settings-value">MIT License</span>
          </div>
        </div>
      </div>
    </div>
  )
}
