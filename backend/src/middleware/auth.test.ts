import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canAccessEvaluation } from './auth'

describe('canAccessEvaluation', () => {
  const evaluation = { evaluateeId: 'employee-1', evaluatorId: 'manager-1', reviewerId: 'reviewer-1' }

  it('allows admins to access any evaluation', () => {
    assert.equal(canAccessEvaluation({ userId: 'someone-else', role: 'ADMIN' }, evaluation), true)
  })

  it('allows the evaluatee', () => {
    assert.equal(canAccessEvaluation({ userId: 'employee-1', role: 'EMPLOYEE' }, evaluation), true)
  })

  it('allows the evaluator', () => {
    assert.equal(canAccessEvaluation({ userId: 'manager-1', role: 'MANAGER' }, evaluation), true)
  })

  it('allows the assigned reviewer', () => {
    assert.equal(canAccessEvaluation({ userId: 'reviewer-1', role: 'MANAGER' }, evaluation), true)
  })

  it('denies unrelated users', () => {
    assert.equal(canAccessEvaluation({ userId: 'employee-2', role: 'EMPLOYEE' }, evaluation), false)
  })
})
