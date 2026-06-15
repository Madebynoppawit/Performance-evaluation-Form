import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Position, Role } from '@prisma/client'
import {
  canAccessEvaluation,
  canIncludeSalary,
  isSupervisoryActor,
} from './accessPolicy'

describe('evaluation access policy', () => {
  const evaluation = {
    evaluateeId: 'employee-1',
    evaluatorId: 'manager-1',
    reviewerId: 'reviewer-1',
  }
  const actor = (userId: string, role: Role, position: Position | null = null) => ({
    userId,
    role,
    position,
  })

  it('allows participants and admins to read', () => {
    assert.equal(canAccessEvaluation(actor('employee-1', Role.EMPLOYEE), evaluation, 'read'), true)
    assert.equal(canAccessEvaluation(actor('manager-1', Role.MANAGER), evaluation, 'read'), true)
    assert.equal(canAccessEvaluation(actor('reviewer-1', Role.MANAGER), evaluation, 'read'), true)
    assert.equal(canAccessEvaluation(actor('admin', Role.ADMIN), evaluation, 'read'), true)
  })

  it('allows only the evaluator to edit evaluation sections', () => {
    assert.equal(canAccessEvaluation(actor('manager-1', Role.MANAGER), evaluation, 'edit'), true)
    assert.equal(canAccessEvaluation(actor('employee-1', Role.EMPLOYEE), evaluation, 'edit'), false)
    assert.equal(canAccessEvaluation(actor('reviewer-1', Role.MANAGER), evaluation, 'edit'), false)
    assert.equal(canAccessEvaluation(actor('admin', Role.ADMIN), evaluation, 'edit'), false)
  })

  it('allows only the assigned reviewer to review', () => {
    assert.equal(canAccessEvaluation(actor('reviewer-1', Role.MANAGER), evaluation, 'review'), true)
    assert.equal(canAccessEvaluation(actor('manager-1', Role.MANAGER), evaluation, 'review'), false)
  })

  it('prevents a manager evaluatee from editing salary', () => {
    assert.equal(canAccessEvaluation(actor('employee-1', Role.MANAGER), evaluation, 'salary'), false)
    assert.equal(canAccessEvaluation(actor('manager-1', Role.MANAGER), evaluation, 'salary'), true)
  })

  it('includes salary only for privileged users and assigned managers', () => {
    assert.equal(canIncludeSalary(actor('employee-1', Role.EMPLOYEE), evaluation), false)
    assert.equal(canIncludeSalary(actor('manager-1', Role.MANAGER), evaluation), true)
    assert.equal(canIncludeSalary(actor('unrelated-manager', Role.MANAGER), evaluation), false)
    assert.equal(canIncludeSalary(actor('admin', Role.ADMIN), evaluation), true)
  })

  it('uses position and privileged roles for supervisory actions', () => {
    assert.equal(isSupervisoryActor(actor('supervisor', Role.EMPLOYEE, Position.SUPERVISOR)), true)
    assert.equal(isSupervisoryActor(actor('ceo', Role.EMPLOYEE, Position.CEO)), true)
    assert.equal(isSupervisoryActor(actor('admin', Role.ADMIN)), true)
    assert.equal(isSupervisoryActor(actor('officer', Role.EMPLOYEE, Position.OFFICER)), false)
  })
})
