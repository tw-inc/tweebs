import { useState, useEffect } from 'react'
import { useAppStore } from './stores/appStore'
import HomeView from './components/Home/HomeView'
import NewProjectView from './components/ProjectCreate/NewProjectView'
import ProjectView from './components/ProjectView'
import OnboardingView from './components/Onboarding/OnboardingView'
import SettingsView from './components/Settings/SettingsView'

export default function App() {
  const { view, activeProjectId, goHome, setView } = useAppStore()
  const [showNewProject, setShowNewProject] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)

  // Check onboarding status on mount
  useEffect(() => {
    window.api.settings.get('onboarding_complete').then((val) => {
      setOnboardingComplete(val === 'true')
    })
  }, [])

  // Still checking
  if (onboardingComplete === null) {
    return (
      <div className="app">
        <div className="app-centered drag-region">
          <h1 className="app-title">TWEEBS</h1>
        </div>
      </div>
    )
  }

  // Show onboarding if not complete
  if (!onboardingComplete) {
    return <OnboardingView onComplete={() => setOnboardingComplete(true)} />
  }

  if (showNewProject) {
    return <NewProjectView onBack={() => setShowNewProject(false)} />
  }

  if (view === 'settings') {
    return <SettingsView onBack={goHome} />
  }

  switch (view) {
    case 'project':
      return activeProjectId ? (
        <ProjectView projectId={activeProjectId} onBack={goHome} />
      ) : (
        <HomeView
          onNewProject={() => setShowNewProject(true)}
          onSettings={() => setView('settings')}
        />
      )
    default:
      return (
        <HomeView
          onNewProject={() => setShowNewProject(true)}
          onSettings={() => setView('settings')}
        />
      )
  }
}
