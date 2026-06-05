import { describe, expect, it } from 'vitest'
import { formatScore, getCycleStatusLabel, getStatusLabel, getTypeLabel } from './utils'

describe('formatScore', () => {
  it('formats numeric scores with two decimals', () => {
    expect(formatScore(4)).toBe('4.00')
    expect(formatScore(3.456)).toBe('3.46')
  })

  it('uses a dash for missing scores', () => {
    expect(formatScore(null)).toBe('-')
    expect(formatScore(undefined)).toBe('-')
  })
})

describe('label helpers', () => {
  it('returns known labels', () => {
    expect(getTypeLabel('THREE_SIXTY')).not.toBe('THREE_SIXTY')
    expect(getStatusLabel('SUBMITTED')).not.toBe('SUBMITTED')
    expect(getCycleStatusLabel('ACTIVE')).not.toBe('ACTIVE')
  })

  it('falls back to unknown values', () => {
    expect(getTypeLabel('UNKNOWN')).toBe('UNKNOWN')
    expect(getStatusLabel('UNKNOWN')).toBe('UNKNOWN')
    expect(getCycleStatusLabel('UNKNOWN')).toBe('UNKNOWN')
  })
})
