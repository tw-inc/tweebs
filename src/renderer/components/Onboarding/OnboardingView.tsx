import { useState, useEffect } from 'react'
import WelcomeStep from './WelcomeStep'
import SubscriptionStep from './SubscriptionStep'
import InstallStep from './InstallStep'
import AuthStep from './AuthStep'
import DisclaimerStep from './DisclaimerStep'

interface OnboardingProps {
  onComplete: () => void
}

export type OnboardingStep = 'welcome' | 'subscription' | 'install' | 'auth' | 'disclaimer'

export default function OnboardingView({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [userName, setUserName] = useState('')

  // Check if we can skip some steps
  useEffect(() => {
    window.api.onboarding.check().then((result) => {
      if (result.step === 'ready') {
        // All deps installed and authed — check if user has completed onboarding before
        window.api.settings.get('onboarding_complete').then((val) => {
          if (val === 'true') {
            onComplete()
          }
        })
      }
    })
  }, [onComplete])

  function handleWelcome(name: string) {
    setUserName(name)
    window.api.settings.set('user_name', name)
    setStep('subscription')
  }

  function handleSubscription() {
    setStep('install')
  }

  function handleInstallComplete() {
    setStep('auth')
  }

  function handleAuthComplete() {
    setStep('disclaimer')
  }

  function handleDisclaimerAccept() {
    window.api.settings.set('onboarding_complete', 'true')
    onComplete()
  }

  switch (step) {
    case 'welcome':
      return <WelcomeStep onNext={handleWelcome} />
    case 'subscription':
      return <SubscriptionStep onNext={handleSubscription} />
    case 'install':
      return <InstallStep onNext={handleInstallComplete} />
    case 'auth':
      return <AuthStep onNext={handleAuthComplete} />
    case 'disclaimer':
      return <DisclaimerStep userName={userName} onAccept={handleDisclaimerAccept} />
    default:
      return null
  }
}
