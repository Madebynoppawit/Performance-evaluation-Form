import { describe, expect, it } from 'vitest'
import { getCompetenciesForPosition } from './competency'

describe('getCompetenciesForPosition', () => {
  it('includes management competencies for managers', () => {
    const competencies = getCompetenciesForPosition('MANAGER')

    expect(competencies.map((c) => c.id)).toContain('MC1')
    expect(competencies.map((c) => c.id)).toContain('MC2')
    expect(competencies.map((c) => c.id)).toContain('TCM1')
  })

  it('uses staff technical competencies for production staff', () => {
    const competencies = getCompetenciesForPosition('PRODUCTION_STAFF')

    expect(competencies.map((c) => c.id)).toEqual(['CC1', 'CC2', 'CC3', 'CC4', 'TCP1', 'TCP2', 'TCP3', 'TCP4'])
  })
})
