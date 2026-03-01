import { useState } from 'react'

export default function SubscriptionStep({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)

  function handleNext() {
    if (selected) {
      window.api.settings.set('subscription_tier', selected)
      onNext()
    }
  }

  return (
    <div className="onboarding-step">
      <div className="onboarding-content">
        <h2 className="onboarding-title">Which plan do you have?</h2>
        <p className="onboarding-subtitle">
          TWEEBS uses your existing Claude subscription. Pick the one you're paying for.
        </p>
        <div className="subscription-options">
          <button
            className={`subscription-card ${selected === '$20' ? 'selected' : ''}`}
            onClick={() => setSelected('$20')}
          >
            <div className="subscription-price">$20/month</div>
            <div className="subscription-desc">Standard plan. One engineer at a time.</div>
          </button>
          <button
            className={`subscription-card ${selected === '$100' ? 'selected' : ''}`}
            onClick={() => setSelected('$100')}
          >
            <div className="subscription-price">$100/month</div>
            <div className="subscription-desc">Pro plan. Faster builds, more capacity.</div>
          </button>
        </div>
        <button
          className="onboarding-next-btn"
          onClick={handleNext}
          disabled={!selected}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
