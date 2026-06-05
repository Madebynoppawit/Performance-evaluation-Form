import { describe, expect, it } from 'vitest'
import { SCORE_TIERS, scoreTier } from './score'

describe('scoreTier', () => {
  it('maps score boundaries to the expected tier labels', () => {
    expect(scoreTier(1).label).toBe('Unsatisfactory')
    expect(scoreTier(1.5).label).toBe('Needs Improvement')
    expect(scoreTier(2.5).label).toBe('Meets Expectation')
    expect(scoreTier(3.5).label).toBe('Exceeds Expectation')
    expect(scoreTier(4.5).label).toBe('Role Model')
    expect(scoreTier(5).label).toBe('Role Model')
  })

  it('clamps out-of-range scores to the nearest tier', () => {
    expect(scoreTier(0).label).toBe('Unsatisfactory')
    expect(scoreTier(6).label).toBe('Role Model')
  })

  it('keeps tier ranges contiguous', () => {
    for (let i = 1; i < SCORE_TIERS.length; i += 1) {
      expect(SCORE_TIERS[i].min).toBe(SCORE_TIERS[i - 1].max)
    }
  })
})
