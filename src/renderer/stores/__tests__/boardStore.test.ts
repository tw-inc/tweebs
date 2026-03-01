import { describe, it, expect } from 'vitest'
import { deriveCardState } from '../boardStore'
import type { Ticket, Tweeb } from '@shared/types'

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-1',
    project_id: 'proj-1',
    assigned_tweeb_id: null,
    title: 'Test ticket',
    description: null,
    column_name: 'backlog',
    priority: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides
  }
}

function makeTweeb(overrides: Partial<Tweeb> = {}): Tweeb {
  return {
    id: 'tweeb-1',
    project_id: 'proj-1',
    role: 'pm',
    display_name: 'PM Tweeb',
    avatar_color: '#a3cbe5',
    pid: null,
    status: 'idle',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides
  }
}

describe('deriveCardState', () => {
  it('returns done for tickets in done column', () => {
    const ticket = makeTicket({ column_name: 'done' })
    expect(deriveCardState(ticket, [])).toBe('done')
  })

  it('returns queued for backlog ticket with no assignee', () => {
    const ticket = makeTicket({ column_name: 'backlog' })
    expect(deriveCardState(ticket, [])).toBe('queued')
  })

  it('returns starting for in_progress ticket with no assignee', () => {
    const ticket = makeTicket({ column_name: 'in_progress' })
    expect(deriveCardState(ticket, [])).toBe('starting')
  })

  it('returns working when assigned tweeb is working', () => {
    const tweeb = makeTweeb({ id: 'tweeb-1', status: 'working' })
    const ticket = makeTicket({ assigned_tweeb_id: 'tweeb-1', column_name: 'in_progress' })
    expect(deriveCardState(ticket, [tweeb])).toBe('working')
  })

  it('returns rate_limited when tweeb is rate limited', () => {
    const tweeb = makeTweeb({ id: 'tweeb-1', status: 'rate_limited' })
    const ticket = makeTicket({ assigned_tweeb_id: 'tweeb-1', column_name: 'in_progress' })
    expect(deriveCardState(ticket, [tweeb])).toBe('rate_limited')
  })

  it('returns error when tweeb has error', () => {
    const tweeb = makeTweeb({ id: 'tweeb-1', status: 'error' })
    const ticket = makeTicket({ assigned_tweeb_id: 'tweeb-1', column_name: 'in_progress' })
    expect(deriveCardState(ticket, [tweeb])).toBe('error')
  })

  it('returns blocked when tweeb is blocked', () => {
    const tweeb = makeTweeb({ id: 'tweeb-1', status: 'blocked' })
    const ticket = makeTicket({ assigned_tweeb_id: 'tweeb-1', column_name: 'in_progress' })
    expect(deriveCardState(ticket, [tweeb])).toBe('blocked')
  })

  it('returns queued for idle assigned tweeb in backlog', () => {
    const tweeb = makeTweeb({ id: 'tweeb-1', status: 'idle' })
    const ticket = makeTicket({ assigned_tweeb_id: 'tweeb-1', column_name: 'backlog' })
    expect(deriveCardState(ticket, [tweeb])).toBe('queued')
  })

  it('always returns done for done column regardless of tweeb status', () => {
    const tweeb = makeTweeb({ id: 'tweeb-1', status: 'error' })
    const ticket = makeTicket({ assigned_tweeb_id: 'tweeb-1', column_name: 'done' })
    expect(deriveCardState(ticket, [tweeb])).toBe('done')
  })
})
