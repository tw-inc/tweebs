import { useEffect } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { useAppStore } from '../../stores/appStore'
import type { Project } from '@shared/types'

export default function HomeView({ onNewProject }: { onNewProject: () => void }) {
  const { projects, loading, fetchProjects } = useProjectStore()
  const openProject = useAppStore((s) => s.openProject)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <div className="home">
      <div className="home-header">
        <h1>Your Projects</h1>
      </div>
      <div className="home-grid">
        <button className="project-card new-project-card" onClick={onNewProject}>
          <span className="new-project-icon">+</span>
          <span className="new-project-label">New Project</span>
        </button>
        {loading && projects.length === 0 && (
          <div className="loading-text">Loading...</div>
        )}
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => openProject(project.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const statusLabel = {
    active: 'In Progress',
    paused: 'Paused',
    completed: 'Done',
    archived: 'Archived'
  }[project.status]

  return (
    <button className="project-card" onClick={onClick}>
      <div className="project-card-name">{project.name}</div>
      {project.description && (
        <div className="project-card-desc">{project.description}</div>
      )}
      <div className={`project-card-status status-${project.status}`}>
        {statusLabel}
      </div>
    </button>
  )
}
