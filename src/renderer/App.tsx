import { useState } from 'react'
import { useAppStore } from './stores/appStore'
import HomeView from './components/Home/HomeView'
import NewProjectView from './components/ProjectCreate/NewProjectView'
import ProjectView from './components/ProjectView'

export default function App() {
  const { view, activeProjectId, goHome } = useAppStore()
  const [showNewProject, setShowNewProject] = useState(false)

  if (showNewProject) {
    return <NewProjectView onBack={() => setShowNewProject(false)} />
  }

  switch (view) {
    case 'home':
      return <HomeView onNewProject={() => setShowNewProject(true)} />
    case 'project':
      return activeProjectId ? (
        <ProjectView projectId={activeProjectId} onBack={goHome} />
      ) : (
        <HomeView onNewProject={() => setShowNewProject(true)} />
      )
    default:
      return <HomeView onNewProject={() => setShowNewProject(true)} />
  }
}
