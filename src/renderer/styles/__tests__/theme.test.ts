import { describe, it, expect } from 'vitest'
import { theme, roleColor } from '../theme'

describe('theme', () => {
  it('has main color as #282f37', () => {
    expect(theme.main).toBe('#282f37')
  })

  it('has all required surface colors', () => {
    expect(theme.bgDeep).toBeDefined()
    expect(theme.bg).toBeDefined()
    expect(theme.bgCard).toBeDefined()
    expect(theme.bgHover).toBeDefined()
    expect(theme.bgElevated).toBeDefined()
  })

  it('has all palette colors as valid hex', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/
    expect(theme.red).toMatch(hexRegex)
    expect(theme.orange).toMatch(hexRegex)
    expect(theme.yellow).toMatch(hexRegex)
    expect(theme.green).toMatch(hexRegex)
    expect(theme.teal).toMatch(hexRegex)
    expect(theme.blue).toMatch(hexRegex)
    expect(theme.indigo).toMatch(hexRegex)
    expect(theme.purple).toMatch(hexRegex)
    expect(theme.pink).toMatch(hexRegex)
  })

  it('has semantic colors mapped to palette', () => {
    expect(theme.accent).toBe(theme.blue)
    expect(theme.success).toBe(theme.green)
    expect(theme.warning).toBe(theme.orange)
    expect(theme.error).toBe(theme.pink)
  })
})

describe('roleColor', () => {
  it('maps all standard roles', () => {
    const roles = ['pm', 'architect', 'ux-designer', 'frontend-engineer', 'backend-engineer', 'mobile-engineer', 'qa-engineer', 'sdet']
    for (const role of roles) {
      expect(roleColor[role]).toBeDefined()
      expect(roleColor[role]).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('uses theme.blue for PM', () => {
    expect(roleColor.pm).toBe(theme.blue)
  })
})
