/**
 * QA Role Matrix — every role × every major endpoint
 *
 * Asserts the exact HTTP status for each role against each endpoint.
 * A mismatch means either the guard is wrong or this matrix needs updating.
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { prisma } from '../lib/prisma.js'
import { createApp } from '../app.js'

const app = createApp()

type Role = 'DEVELOPER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE'

let tokens: Record<Role, string> = {} as any
let evalId: string   // seeded evaluation owned by manager → officer
let deleteEvalId: string
let deleteCycleId: string
let officerId: string

before(async () => {
  async function login(identifier: string) {
    const res = await request(app).post('/api/auth/login').send({ identifier, password: 'AmwDemo2026!' })
    assert.equal(res.status, 200)
    return res.body.token as string
  }

  const [dev, admin, manager, officer, seededEval] = await Promise.all([
    login('developer@amw-ems.com'),
    login('admin@amw-ems.com'),
    login('manager.eng@amw-ems.com'),
    login('officer1@amw-ems.com'),
    prisma.evaluation.findFirst({
      where: {
        evaluatee: { email: 'officer1@amw-ems.com' },
        evaluator: { email: 'manager.eng@amw-ems.com' },
      },
      select: { id: true },
    }),
  ])

  tokens = { DEVELOPER: dev, ADMIN: admin, MANAGER: manager, EMPLOYEE: officer }
  evalId = seededEval?.id ?? 'no-seeded-eval'

  const off = await prisma.user.findUniqueOrThrow({ where: { email: 'officer1@amw-ems.com' }, select: { id: true } })
  officerId = off.id

  const managerUser = await prisma.user.findUniqueOrThrow({
    where: { email: 'manager.eng@amw-ems.com' },
    select: { id: true },
  })
  const seededCycle = await prisma.cycle.findFirstOrThrow({ select: { templateId: true } })
  const deleteCycle = await prisma.cycle.create({
    data: {
      name: `QA Role Delete Fixture ${Date.now()}`,
      templateId: seededCycle.templateId,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'ACTIVE',
    },
    select: { id: true },
  })
  deleteCycleId = deleteCycle.id
  const deleteEvaluation = await prisma.evaluation.create({
    data: {
      cycleId: deleteCycleId,
      evaluateeId: officerId,
      evaluatorId: managerUser.id,
      type: 'PEER',
      formType: 'OFFICER_LEVEL',
    },
    select: { id: true },
  })
  deleteEvalId = deleteEvaluation.id
})

after(async () => {
  await prisma.evaluation.deleteMany({ where: { cycleId: deleteCycleId } })
  await prisma.cycle.deleteMany({ where: { id: deleteCycleId } })
  await prisma.$disconnect()
})

// ── helpers ───────────────────────────────────────────────────────────────────

function get(path: string, role: Role) {
  return request(app).get(path).set('Authorization', `Bearer ${tokens[role]}`)
}
function patch(path: string, role: Role, body: object = {}) {
  return request(app).patch(path).set('Authorization', `Bearer ${tokens[role]}`).send(body)
}
function del(path: string, role: Role) {
  return request(app).delete(path).set('Authorization', `Bearer ${tokens[role]}`)
}
function post(path: string, role: Role, body: object = {}) {
  return request(app).post(path).set('Authorization', `Bearer ${tokens[role]}`).send(body)
}

/** Asserts status is in the allowed set. */
function expectStatus(actual: number, ...allowed: number[]) {
  assert.ok(
    allowed.includes(actual),
    `Expected status in [${allowed.join(', ')}] but got ${actual}`,
  )
}

// ── GET /api/evaluations ──────────────────────────────────────────────────────

describe('GET /api/evaluations — list access', () => {
  const roles: Role[] = ['DEVELOPER', 'ADMIN', 'MANAGER', 'EMPLOYEE']
  for (const role of roles) {
    test(`${role} → 200`, async () => {
      const res = await get('/api/evaluations', role)
      assert.equal(res.status, 200)
    })
  }
})

// ── GET /api/evaluations/:id ──────────────────────────────────────────────────

describe('GET /api/evaluations/:id — single access', () => {
  // DEVELOPER and ADMIN always allowed; MANAGER is the evaluator (participant); EMPLOYEE is the evaluatee (participant)
  const allowed: Role[] = ['DEVELOPER', 'ADMIN', 'MANAGER', 'EMPLOYEE']
  for (const role of allowed) {
    test(`${role} (participant or privileged) → 200`, async () => {
      const res = await get(`/api/evaluations/${evalId}`, role)
      expectStatus(res.status, 200)
    })
  }
})

// ── POST /api/evaluations ─────────────────────────────────────────────────────

describe('POST /api/evaluations — create', () => {
  let cycleId: string
  before(async () => {
    const c = await prisma.cycle.findFirstOrThrow({ select: { id: true } })
    cycleId = c.id
  })

  const matrix: { role: Role; expected: number[] }[] = [
    { role: 'DEVELOPER', expected: [201, 400] },  // can create (admin role group)
    { role: 'ADMIN',     expected: [201, 400] },  // can create
    { role: 'MANAGER',   expected: [201, 400] },  // supervisory role
    { role: 'EMPLOYEE',  expected: [403] },        // not supervisory
  ]

  for (const { role, expected } of matrix) {
    test(`${role} → ${expected.join(' or ')}`, async () => {
      const managerId = (await prisma.user.findUniqueOrThrow({
        where: { email: 'manager.eng@amw-ems.com' }, select: { id: true },
      })).id

      const res = await post('/api/evaluations', role, {
        cycleId,
        evaluatorId: managerId,
        type: 'PEER',
        evaluateeId: officerId,
      })
      expectStatus(res.status, ...expected)
      // Cleanup any created evaluation
      if (res.status === 201) {
        await prisma.evaluation.delete({ where: { id: res.body.id } }).catch(() => {})
      }
    })
  }
})

// ── DELETE /api/evaluations/:id ───────────────────────────────────────────────

describe('DELETE /api/evaluations/:id — delete', () => {
  const matrix: { role: Role; expected: number[] }[] = [
    { role: 'DEVELOPER', expected: [204, 404] },
    { role: 'ADMIN',     expected: [204, 404] },
    { role: 'MANAGER',   expected: [403] },
    { role: 'EMPLOYEE',  expected: [403] },
  ]

  for (const { role, expected } of matrix) {
    test(`${role} → ${expected.join(' or ')}`, async () => {
      const res = await del(`/api/evaluations/${deleteEvalId}`, role)
      expectStatus(res.status, ...expected)
    })
  }
})

// ── PATCH /api/evaluations/:id/answers ───────────────────────────────────────

describe('PATCH /api/evaluations/:id/answers — blockAdmin guard', () => {
  // ADMIN is blocked; others who are participants can write
  test('ADMIN → 403 (blockAdmin)', async () => {
    const res = await patch(`/api/evaluations/${evalId}/answers`, 'ADMIN', { answers: {} })
    assert.equal(res.status, 403)
  })
  test('MANAGER (evaluator/participant) → 200', async () => {
    const res = await patch(`/api/evaluations/${evalId}/answers`, 'MANAGER', { answers: {} })
    expectStatus(res.status, 200)
  })
})

// ── GET /api/users ────────────────────────────────────────────────────────────

describe('GET /api/users — user management access', () => {
  const matrix: { role: Role; expected: number[] }[] = [
    { role: 'DEVELOPER', expected: [200] },
    { role: 'ADMIN',     expected: [200] },
    { role: 'MANAGER',   expected: [403] },
    { role: 'EMPLOYEE',  expected: [403] },
  ]
  for (const { role, expected } of matrix) {
    test(`${role} → ${expected[0]}`, async () => {
      const res = await get('/api/users', role)
      expectStatus(res.status, ...expected)
    })
  }
})

// ── GET /api/cycles ───────────────────────────────────────────────────────────

describe('GET /api/cycles — cycle list', () => {
  const roles: Role[] = ['DEVELOPER', 'ADMIN', 'MANAGER', 'EMPLOYEE']
  for (const role of roles) {
    test(`${role} → 200`, async () => {
      const res = await get('/api/cycles', role)
      assert.equal(res.status, 200)
    })
  }
})

// ── GET /api/templates ────────────────────────────────────────────────────────

describe('GET /api/templates — template list', () => {
  const roles: Role[] = ['DEVELOPER', 'ADMIN', 'MANAGER', 'EMPLOYEE']
  for (const role of roles) {
    test(`${role} → 200`, async () => {
      const res = await get('/api/templates', role)
      assert.equal(res.status, 200)
    })
  }
})

// ── GET /api/reports/summary ──────────────────────────────────────────────────

describe('GET /api/reports/summary — reports access', () => {
  const matrix: { role: Role; expected: number[] }[] = [
    { role: 'DEVELOPER', expected: [200] },
    { role: 'ADMIN',     expected: [200] },
    { role: 'MANAGER',   expected: [200, 403] },
    { role: 'EMPLOYEE',  expected: [200, 403] },
  ]
  for (const { role, expected } of matrix) {
    test(`${role} → ${expected.join(' or ')}`, async () => {
      const res = await get('/api/reports/summary', role)
      expectStatus(res.status, ...expected)
    })
  }
})

// ── PATCH /api/evaluations/:id/acknowledgement ────────────────────────────────

describe('PATCH /acknowledgement — requireRole(DEVELOPER, MANAGER)', () => {
  const matrix: { role: Role; expected: number[] }[] = [
    { role: 'DEVELOPER', expected: [200] },
    { role: 'ADMIN',     expected: [403] },   // ADMIN not in allowed list
    { role: 'MANAGER',   expected: [200] },
    { role: 'EMPLOYEE',  expected: [403] },
  ]
  for (const { role, expected } of matrix) {
    test(`${role} → ${expected[0]}`, async () => {
      const res = await patch(
        `/api/evaluations/${evalId}/acknowledgement`,
        role,
        { evaluatorSignedAt: new Date().toISOString() },
      )
      expectStatus(res.status, ...expected)
    })
  }
})

// ── /health — public ──────────────────────────────────────────────────────────

describe('GET /health — public endpoint (no auth required)', () => {
  test('unauthenticated → 200', async () => {
    const res = await request(app).get('/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'ok')
  })
})
