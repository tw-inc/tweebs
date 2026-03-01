export default function DisclaimerStep({ userName, onAccept }: { userName: string; onAccept: () => void }) {
  return (
    <div className="onboarding-step">
      <div className="onboarding-content">
        <h2 className="onboarding-title">Almost there, {userName}!</h2>
        <p className="onboarding-subtitle">
          Just so you know what TWEEBS does:
        </p>

        <div className="disclaimer-list">
          <div className="disclaimer-item">
            Your AI engineers will read and write files on your computer in a dedicated projects folder.
          </div>
          <div className="disclaimer-item">
            They use your Claude subscription to think and code. Usage counts toward your plan limits.
          </div>
          <div className="disclaimer-item">
            Everything stays on your Mac. We don't send your code or data anywhere.
          </div>
          <div className="disclaimer-item">
            You can stop any engineer at any time. You're always in control.
          </div>
        </div>

        <button className="onboarding-next-btn" onClick={onAccept}>
          Sounds good, let's build!
        </button>
      </div>
    </div>
  )
}
