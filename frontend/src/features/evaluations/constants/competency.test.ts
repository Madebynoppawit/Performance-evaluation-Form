import { describe, expect, it } from 'vitest'
import { getCompetenciesForPosition } from './competency'

describe('getCompetenciesForPosition', () => {
  it('includes management competencies for managers', () => {
    const competencies = getCompetenciesForPosition('MANAGER')

    expect(competencies.map((c) => c.id)).toContain('MC1')
    expect(competencies.map((c) => c.id)).toContain('MC2')
    expect(competencies.map((c) => c.id)).toContain('TCM1')
  })

  it('assesses production staff on the four core competencies only', () => {
    const competencies = getCompetenciesForPosition('PRODUCTION_STAFF')

    expect(competencies.map((c) => c.id)).toEqual(['CC1', 'CC2', 'CC3', 'CC4'])
  })

  it('assesses officer and supervisor on the four core competencies only', () => {
    expect(getCompetenciesForPosition('OFFICER').map((c) => c.id)).toEqual(['CC1', 'CC2', 'CC3', 'CC4'])
    expect(getCompetenciesForPosition('SUPERVISOR').map((c) => c.id)).toEqual(['CC1', 'CC2', 'CC3', 'CC4'])
  })
})
