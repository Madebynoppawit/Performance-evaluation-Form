import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { calculateTotalScore } from './evaluationService.js'

describe('calculateTotalScore', () => {
  test('returns null for empty input', () => {
    assert.strictEqual(calculateTotalScore([]), null)
  })

  test('returns null when no rating answers present', () => {
    assert.strictEqual(calculateTotalScore([{ type: 'text', score: null, weight: 1 }]), null)
  })

  test('returns null when all rating scores are null', () => {
    assert.strictEqual(calculateTotalScore([{ type: 'rating', score: null, weight: 1 }]), null)
  })

  test('returns null when total weight is zero', () => {
    assert.strictEqual(calculateTotalScore([{ type: 'rating', score: 5, weight: 0 }]), null)
  })

  test('returns the score for a single rated answer', () => {
    assert.strictEqual(calculateTotalScore([{ type: 'rating', score: 4, weight: 1 }]), 4)
  })

  test('computes simple average for equal weights', () => {
    const score = calculateTotalScore([
      { type: 'rating', score: 3, weight: 1 },
      { type: 'rating', score: 5, weight: 1 },
    ])
    assert.strictEqual(score, 4)
  })

  test('computes weighted average', () => {
    // (2*1 + 4*3) / (1+3) = 14/4 = 3.5
    const score = calculateTotalScore([
      { type: 'rating', score: 2, weight: 1 },
      { type: 'rating', score: 4, weight: 3 },
    ])
    assert.strictEqual(score, 3.5)
  })

  test('ignores text answers mixed with rating answers', () => {
    const score = calculateTotalScore([
      { type: 'rating', score: 4, weight: 2 },
      { type: 'text',   score: null, weight: 0 },
    ])
    assert.strictEqual(score, 4)
  })

  test('ignores null-score rating among scored ratings', () => {
    const score = calculateTotalScore([
      { type: 'rating', score: 4, weight: 1 },
      { type: 'rating', score: null, weight: 1 },
    ])
    assert.strictEqual(score, 4)
  })
})
