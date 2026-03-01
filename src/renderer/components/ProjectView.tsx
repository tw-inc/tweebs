import { useEffect, useState } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useBoardStore } from '../stores/boardStore'
import ChatView from './Chat/ChatView'
import BoardView from './Board/BoardView'
import type { Project, Ticket, Message, Tweeb } from '@shared/types'

interface ProjectData {
  project: Project
  tickets: Ticket[]
  messages: Message[]
  tweebs: Tweeb[]
}

export default function ProjectView({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const [data, setData] = useState<ProjectData | null>(null)
  const { setMessages, clear: clearChat } = useChatStore()
  const { setTickets, setTweebs, clear: clearBoard } = useBoardStore()

  useEffect(() => {
    clearChat()
    clearBoard()
    window.api.projects.get(projectId).then((d) => {
      setData(d)
      setMessages(d.messages)
      setTickets(d.tickets)
      setTweebs(d.tweebs)
    })
    return () => {
      clearChat()
      clearBoard()
    }
  }, [projectId, setMessages, setTickets, setTweebs, clearChat, clearBoard])

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
          <ChatView projectId={projectId} />
        </div>
        <div className="project-view-board">
          <BoardView projectId={projectId} />
        </div>
      </div>
    </div>
  )
}
