import type { Ticket, Tweeb, CardState } from '@shared/types'
import { deriveCardState } from '../../stores/boardStore'
import { roleColor, theme } from '../../styles/theme'

export const STATE_CONFIG: Record<CardState, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'state-queued' },
  starting: { label: 'Starting...', className: 'state-starting' },
  working: { label: 'Working', className: 'state-working' },
  rate_limited: { label: 'Taking a break', className: 'state-rate-limited' },
  blocked: { label: 'Blocked', className: 'state-blocked' },
  done: { label: 'Done', className: 'state-done' },
  error: { label: 'Error', className: 'state-error' }
}

interface CardProps {
  ticket: Ticket
  tweebs: Tweeb[]
  onClick: () => void
}

export default function Card({ ticket, tweebs, onClick }: CardProps) {
  const assignedTweeb = tweebs.find((t) => t.id === ticket.assigned_tweeb_id)
  const cardState = deriveCardState(ticket, tweebs)
  const config = STATE_CONFIG[cardState]
  const avatarColor = assignedTweeb ? (roleColor[assignedTweeb.role] || theme.textMuted) : theme.textFaint

  return (
    <button className={`card ${config.className}`} onClick={onClick}>
      <div className="card-header">
        <div className="card-avatar" style={{ background: avatarColor }}>
          {assignedTweeb ? assignedTweeb.role.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="card-title">{ticket.title}</div>
      </div>
      {assignedTweeb && (
        <div className="card-role">{assignedTweeb.display_name}</div>
      )}
      <div className={`card-status ${config.className}`}>
        {config.label}
      </div>
    </button>
  )
}
