import { create } from 'zustand'
import type { Ticket, Tweeb, CardState, TweebStatus } from '@shared/types'

interface BoardState {
  tickets: Ticket[]
  tweebs: Tweeb[]
  selectedTicketId: string | null
  setTickets: (tickets: Ticket[]) => void
  setTweebs: (tweebs: Tweeb[]) => void
  updateTickets: (tickets: Ticket[]) => void
  updateTweeb: (tweeb: Tweeb) => void
  selectTicket: (id: string | null) => void
  clear: () => void
}

export const useBoardStore = create<BoardState>((set) => ({
  tickets: [],
  tweebs: [],
  selectedTicketId: null,

  setTickets: (tickets) => set({ tickets }),
  setTweebs: (tweebs) => set({ tweebs }),

  updateTickets: (newTickets) =>
    set((state) => {
      const ticketMap = new Map(state.tickets.map((t) => [t.id, t]))
      for (const t of newTickets) {
        ticketMap.set(t.id, t)
      }
      return { tickets: Array.from(ticketMap.values()) }
    }),

  updateTweeb: (tweeb) =>
    set((state) => {
      const exists = state.tweebs.some((t) => t.id === tweeb.id)
      if (exists) {
        return { tweebs: state.tweebs.map((t) => (t.id === tweeb.id ? tweeb : t)) }
      }
      return { tweebs: [...state.tweebs, tweeb] }
    }),

  selectTicket: (id) => set({ selectedTicketId: id }),
  clear: () => set({ tickets: [], tweebs: [], selectedTicketId: null })
}))

export function deriveCardState(ticket: Ticket, tweebs: Tweeb[]): CardState {
  if (ticket.column_name === 'done') return 'done'

  const assignedTweeb = tweebs.find((t) => t.id === ticket.assigned_tweeb_id)
  if (!assignedTweeb) {
    return ticket.column_name === 'in_progress' ? 'starting' : 'queued'
  }

  const statusMap: Record<TweebStatus, CardState> = {
    idle: 'queued',
    working: 'working',
    blocked: 'blocked',
    done: 'done',
    rate_limited: 'rate_limited',
    error: 'error'
  }

  return statusMap[assignedTweeb.status] || 'queued'
}
