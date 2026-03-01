import { useEffect } from 'react'
import { useBoardStore } from '../../stores/boardStore'
import Column from './Column'
import TicketDetail from './TicketDetail'
import type { Ticket, Tweeb, TicketColumn } from '@shared/types'

const COLUMNS: TicketColumn[] = ['backlog', 'in_progress', 'done']

export default function BoardView({ projectId }: { projectId: string }) {
  const { tickets, tweebs, selectedTicketId, updateTickets, updateTweeb, selectTicket } =
    useBoardStore()

  // Listen for board updates from main process — filter by projectId
  useEffect(() => {
    const unsubBoard = window.api.board.onUpdate((newTickets) => {
      const filtered = (newTickets as Ticket[]).filter((t) => t.project_id === projectId)
      if (filtered.length > 0) updateTickets(filtered)
    })
    const unsubTweeb = window.api.tweeb.onStatus((data) => {
      const tweeb = data as Tweeb
      if (tweeb.project_id !== projectId) return
      updateTweeb(tweeb)
    })
    return () => {
      unsubBoard()
      unsubTweeb()
    }
  }, [updateTickets, updateTweeb, projectId])

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId)

  return (
    <div className="board-view">
      <div className="board-columns">
        {COLUMNS.map((col) => (
          <Column
            key={col}
            column={col}
            tickets={tickets.filter((t) => t.column_name === col)}
            tweebs={tweebs}
            onCardClick={selectTicket}
          />
        ))}
      </div>

      {selectedTicket && (
        <TicketDetail
          ticket={selectedTicket}
          tweebs={tweebs}
          onClose={() => selectTicket(null)}
        />
      )}
    </div>
  )
}
