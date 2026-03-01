import { useState } from 'react'

export default function WelcomeStep({ onNext }: { onNext: (name: string) => void }) {
  const [name, setName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim()) {
      onNext(name.trim())
    }
  }

  return (
    <div className="onboarding-step">
      <div className="onboarding-content">
        <h1 className="onboarding-title">Welcome to TWEEBS</h1>
        <p className="onboarding-subtitle">
          Your team of AI engineers, ready to build whatever you dream up.
        </p>
        <form className="onboarding-form" onSubmit={handleSubmit}>
          <label className="onboarding-label">What's your name?</label>
          <input
            type="text"
            className="onboarding-input"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={30}
          />
          <button
            type="submit"
            className="onboarding-next-btn"
            disabled={!name.trim()}
          >
            Get Started
          </button>
        </form>
      </div>
    </div>
  )
}
