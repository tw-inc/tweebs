import type { Ticket, Tweeb, TicketColumn } from '@shared/types'
import Card from './Card'

const COLUMN_LABELS: Record<TicketColumn, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  done: 'Done'
}

interface ColumnProps {
  column: TicketColumn
  tickets: Ticket[]
  tweebs: Tweeb[]
  onCardClick: (ticketId: string) => void
}

export default function Column({ column, tickets, tweebs, onCardClick }: ColumnProps) {
  return (
    <div className="board-column">
      <div className="column-header">
        <span className="column-title">{COLUMN_LABELS[column]}</span>
        <span className="column-count">{tickets.length}</span>
      </div>
      <div className="column-cards">
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            ticket={ticket}
            tweebs={tweebs}
            onClick={() => onCardClick(ticket.id)}
          />
        ))}
        {tickets.length === 0 && (
          <div className="column-empty">No tickets</div>
        )}
      </div>
    </div>
  )
}
