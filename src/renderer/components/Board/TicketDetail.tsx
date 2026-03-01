import { useEffect } from 'react'
import type { Ticket, Tweeb } from '@shared/types'
import { deriveCardState } from '../../stores/boardStore'
import { STATE_CONFIG } from './Card'

interface TicketDetailProps {
  ticket: Ticket
  tweebs: Tweeb[]
  onClose: () => void
}

export default function TicketDetail({ ticket, tweebs, onClose }: TicketDetailProps) {
  const assignedTweeb = tweebs.find((t) => t.id === ticket.assigned_tweeb_id)
  const cardState = deriveCardState(ticket, tweebs)
  const stateInfo = STATE_CONFIG[cardState]

  // Escape key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const columnLabel: Record<string, string> = {
    backlog: 'Backlog',
    in_progress: 'In Progress',
    done: 'Done'
  }

  return (
    <div className="ticket-detail-overlay" onClick={onClose}>
      <div className="ticket-detail" onClick={(e) => e.stopPropagation()}>
        <div className="ticket-detail-header">
          <h3>{ticket.title}</h3>
          <button className="ticket-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="ticket-detail-body">
          <div className="ticket-detail-row">
            <span className="ticket-label">Status</span>
            <span className={`ticket-value card-status ${stateInfo.className}`}>{stateInfo.label}</span>
          </div>

          {assignedTweeb && (
            <div className="ticket-detail-row">
              <span className="ticket-label">Assigned to</span>
              <span className="ticket-value">{assignedTweeb.display_name}</span>
            </div>
          )}

          <div className="ticket-detail-row">
            <span className="ticket-label">Column</span>
            <span className="ticket-value">{columnLabel[ticket.column_name] || ticket.column_name}</span>
          </div>

          {ticket.description && (
            <div className="ticket-detail-section">
              <span className="ticket-label">Description</span>
              <p className="ticket-description">{ticket.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
