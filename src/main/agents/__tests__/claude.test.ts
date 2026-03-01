import { describe, it, expect } from 'vitest'
import { parseStreamLine } from '../claude'

describe('parseStreamLine', () => {
  it('parses content_block_delta with text_delta', () => {
    const line = JSON.stringify({
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'Hello world' }
    })

    const msg = parseStreamLine(line)
    expect(msg).not.toBeNull()
    expect(msg!.type).toBe('text')
    expect(msg!.content).toBe('Hello world')
  })

  it('parses assistant message with text content blocks', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'Part 1 ' },
          { type: 'text', text: 'Part 2' }
        ]
      }
    })

    const msg = parseStreamLine(line)
    expect(msg).not.toBeNull()
    expect(msg!.type).toBe('text')
    expect(msg!.content).toBe('Part 1 Part 2')
  })

  it('parses result with session_id', () => {
    const line = JSON.stringify({
      type: 'result',
      session_id: 'sess-abc123'
    })

    const msg = parseStreamLine(line)
    expect(msg).not.toBeNull()
    expect(msg!.type).toBe('system')
    expect(msg!.content).toBe('session:sess-abc123')
  })

  it('parses result with text result', () => {
    const line = JSON.stringify({
      type: 'result',
      result: 'Final output text'
    })

    const msg = parseStreamLine(line)
    expect(msg).not.toBeNull()
    expect(msg!.type).toBe('text')
    expect(msg!.content).toBe('Final output text')
  })

  it('parses error messages', () => {
    const line = JSON.stringify({
      type: 'error',
      error: { message: 'Something went wrong' }
    })

    const msg = parseStreamLine(line)
    expect(msg).not.toBeNull()
    expect(msg!.type).toBe('error')
    expect(msg!.content).toBe('Something went wrong')
  })

  it('parses content_block_start for tool_use', () => {
    const line = JSON.stringify({
      type: 'content_block_start',
      content_block: { type: 'tool_use', name: 'write_file' }
    })

    const msg = parseStreamLine(line)
    expect(msg).not.toBeNull()
    expect(msg!.type).toBe('tool_use')
    expect(msg!.content).toBe('write_file')
  })

  it('returns null for invalid JSON', () => {
    expect(parseStreamLine('not json')).toBeNull()
    expect(parseStreamLine('{incomplete')).toBeNull()
  })

  it('returns null for unknown message types', () => {
    const line = JSON.stringify({ type: 'ping' })
    expect(parseStreamLine(line)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseStreamLine('')).toBeNull()
  })

  it('parses fallback top-level text field', () => {
    const line = JSON.stringify({ text: 'fallback text' })

    const msg = parseStreamLine(line)
    expect(msg).not.toBeNull()
    expect(msg!.type).toBe('text')
    expect(msg!.content).toBe('fallback text')
  })
})
