import { useEffect, useState } from 'react'
import type { Project, Ticket, Message, Tweeb } from '@shared/types'

interface ProjectData {
  project: Project
  tickets: Ticket[]
  messages: Message[]
  tweebs: Tweeb[]
}

export default function ProjectView({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const [data, setData] = useState<ProjectData | null>(null)

  useEffect(() => {
    window.api.projects.get(projectId).then(setData)
  }, [projectId])

  if (!data) {
    return (
      <div className="project-loading">
        <div className="loading-text">Loading project...</div>
      </div>
    )
  }

  return (
    <div className="project-view">
      <div className="project-view-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>{data.project.name}</h2>
      </div>
      <div className="project-view-body">
        <div className="project-view-chat">
          <div className="placeholder-text">Chat panel — Phase 3</div>
        </div>
        <div className="project-view-board">
          <div className="placeholder-text">Board panel — Phase 4</div>
        </div>
      </div>
    </div>
  )
}
