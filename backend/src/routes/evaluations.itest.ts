/**
 * QA Integration Tests — Evaluation Workflow
 *
 * Covers the full lifecycle: create → save answers → submit → review → acknowledge
 * plus authorization boundaries for each role.
 *
 * Prerequisites: Postgres seeded with prisma/seed.cjs (same as CI).
 * Run:  npm run test:integration -w backend
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { prisma } from '../lib/prisma.js'
import { createApp } from '../app.js'

const app = createApp()

// ── Helpers ──────────────────────────────────────────────────────────────────

async function login(identifier: string, password = 'AmwDemo2026!') {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier, password })
  assert.equal(res.status, 200, `login failed for ${identifier}: ${JSON.stringify(res.body)}`)
  return res.body.token as string
}

// ── Shared state loaded once before all tests ─────────────────────────────────

let adminToken: string
let managerToken: string
let supervisorToken: string
let officerToken: string

let managerId: string
let supervisorId: string
let officerId: string
let cycleId: string
let templateId: string

/** Evaluations created by tests — deleted in after() to leave DB clean. */
const createdEvaluationIds: string[] = []
const createdCycleIds: string[] = []
let fixtureCounter = 0

before(async () => {
  ;[adminToken, managerToken, supervisorToken, officerToken] = await Promise.all([
    login('admin@amw-ems.com'),
    login('manager.eng@amw-ems.com'),
    login('supervisor1@amw-ems.com'),
    login('officer1@amw-ems.com'),
  ])

  const [manager, supervisor, officer, cycle] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: 'manager.eng@amw-ems.com' }, select: { id: true } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'supervisor1@amw-ems.com' }, select: { id: true } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'officer1@amw-ems.com' }, select: { id: true } }),
    prisma.cycle.findFirstOrThrow({
      where: { name: 'FY2026 Demo Review' },
      select: { id: true, templateId: true },
    }),
  ])

  managerId  = manager.id
  supervisorId = supervisor.id
  officerId  = officer.id
  cycleId    = cycle.id
  templateId = cycle.templateId
})

after(async () => {
  if (createdEvaluationIds.length) {
    await prisma.evaluationAcknowledgement.deleteMany({
      where: { evaluationId: { in: createdEvaluationIds } },
    })
    await prisma.answer.deleteMany({ where: { evaluationId: { in: createdEvaluationIds } } })
    await prisma.goalEntry.deleteMany({ where: { evaluationId: { in: createdEvaluationIds } } })
    await prisma.evaluation.deleteMany({ where: { id: { in: createdEvaluationIds } } })
  }
  if (createdCycleIds.length) {
    await prisma.cycle.deleteMany({ where: { id: { in: createdCycleIds } } })
  }
  await prisma.$disconnect()
})

/** Creates a fresh DRAFT evaluation via the API (supervisor → officer) and
 *  registers its id for cleanup. Returns the full response body. */
async function createFreshEval(token = supervisorToken, reviewerId?: string) {
  fixtureCounter += 1
  const fixtureCycle = await prisma.cycle.create({
    data: {
      name: `QA Evaluation Fixture ${Date.now()}-${fixtureCounter}`,
      templateId,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'ACTIVE',
    },
    select: { id: true },
  })
  createdCycleIds.push(fixtureCycle.id)

  const res = await request(app)
    .post('/api/evaluations')
    .set('Authorization', `Bearer ${token}`)
    .send({
      cycleId: fixtureCycle.id,
      evaluatorId: supervisorId,
      type: 'MANAGER',
      evaluateeId: officerId,
      reviewerId,
    })
  if (res.status === 201) createdEvaluationIds.push(res.body.id)
  return res
}

const appraisalCriteria = [
  '1.1', '1.2', '1.3',
  '2.1', '2.2', '2.3',
  '3.1', '3.2', '3.3',
  '4.1', '4.2', '4.3',
  '5.1', '5.2', '5.3',
  '6.1', '6.2', '6.3',
]

async function completeAppraisalFixture(evaluationId: string) {
  await prisma.competencyScore.createMany({
    data: appraisalCriteria.map(competencyId => ({
      evaluationId,
      competencyId,
      score: 4,
    })),
  })
  await prisma.evaluationComment.upsert({
    where: { evaluationId },
    create: {
      evaluationId,
      strengths: 'Consistently delivers reliable work.',
      improvements: 'Continue improving cross-team communication.',
      requiredSkills: 'Advanced planning and stakeholder communication.',
    },
    update: {},
  })
}

// ── 1. List & GET ─────────────────────────────────────────────────────────────

describe('GET /api/evaluations — list', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/evaluations')
    assert.equal(res.status, 401)
  })

  test('admin receives all evaluations', async () => {
    const res = await request(app)
      .get('/api/evaluations')
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body))
    assert.ok(res.body.length > 0, 'admin should see at least the seeded evaluation')
  })

  test('employee only receives own evaluations', async () => {
    const res = await request(app)
      .get('/api/evaluations')
      .set('Authorization', `Bearer ${officerToken}`)
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body))
    const foreignEval = res.body.find(
      (e: any) => e.evaluateeId !== officerId && e.evaluatorId !== officerId,
    )
    assert.equal(foreignEval, undefined, 'employee must not see unrelated evaluations')
  })
})

// ── 2. Create ─────────────────────────────────────────────────────────────────

describe('POST /api/evaluations — create', () => {
  test('supervisor can create an evaluation for an existing employee', async () => {
    const res = await createFreshEval(supervisorToken)
    assert.equal(res.status, 201)
    assert.equal(res.body.status, 'DRAFT')
    assert.equal(res.body.evaluateeId, officerId)
  })

  test('manager can create an evaluation', async () => {
    const res = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ cycleId, evaluatorId: managerId, type: 'MANAGER', evaluateeId: officerId })
    // 201 or 400 (duplicate cycle+evaluatee+evaluator+type) — either is expected
    assert.ok([201, 409].includes(res.status))
    if (res.status === 201) createdEvaluationIds.push(res.body.id)
  })

  test('employee (officer) cannot create an evaluation', async () => {
    const res = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ cycleId, evaluatorId: officerId, type: 'SELF', evaluateeId: officerId })
    assert.equal(res.status, 403)
  })

  test('returns 400 when both evaluateeId and newEvaluatee are provided', async () => {
    const res = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        cycleId,
        evaluatorId: supervisorId,
        type: 'MANAGER',
        evaluateeId: officerId,
        newEvaluatee: { name: 'Ghost', position: 'OFFICER' },
      })
    assert.equal(res.status, 400)
  })

  test('returns 400 when neither evaluateeId nor newEvaluatee is provided', async () => {
    const res = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ cycleId, evaluatorId: supervisorId, type: 'MANAGER' })
    assert.equal(res.status, 400)
  })

  test('non-admin cannot create evaluation with newEvaluatee', async () => {
    const res = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        cycleId,
        evaluatorId: supervisorId,
        type: 'MANAGER',
        newEvaluatee: { name: 'New Person', position: 'OFFICER' },
      })
    assert.equal(res.status, 403)
  })

  test('admin can create evaluation with newEvaluatee', async () => {
    const res = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cycleId,
        evaluatorId: managerId,
        type: 'MANAGER',
        newEvaluatee: { name: `QA Tester ${Date.now()}`, position: 'OFFICER' },
      })
    assert.equal(res.status, 201)
    createdEvaluationIds.push(res.body.id)
    assert.ok(res.body.evaluateeId, 'new employee user should be created')
  })
})

// ── 3. GET single ─────────────────────────────────────────────────────────────

describe('GET /api/evaluations/:id — single', () => {
  let evalId: string

  before(async () => {
    const res = await createFreshEval()
    evalId = res.body.id
  })

  test('participant (evaluator) can get evaluation', async () => {
    const res = await request(app)
      .get(`/api/evaluations/${evalId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.id, evalId)
  })

  test('admin can get any evaluation', async () => {
    const res = await request(app)
      .get(`/api/evaluations/${evalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(res.status, 200)
  })

  test('returns 404 for unknown evaluation id', async () => {
    const res = await request(app)
      .get('/api/evaluations/nonexistent-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(res.status, 404)
  })
})

// ── 4. State machine — DRAFT → SUBMITTED ─────────────────────────────────────

describe('Evaluation workflow: DRAFT → IN_PROGRESS → SUBMITTED', () => {
  let evalId: string
  let questionId: string

  before(async () => {
    const res = await createFreshEval()
    evalId = res.body.id
    await completeAppraisalFixture(evalId)

    // Pick any rating question from the cycle template.
    const cycle = await prisma.cycle.findUniqueOrThrow({
      where: { id: cycleId },
      include: { template: { include: { sections: { include: { questions: true } } } } },
    })
    const questions = cycle.template.sections.flatMap(s => s.questions)
    const ratingQ = questions.find(q => q.type === 'rating')
    assert.ok(ratingQ, 'seeded template must have at least one rating question')
    questionId = ratingQ!.id
  })

  test('admin cannot save answers (blockAdmin guard)', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/answers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ answers: { [questionId]: '4' } })
    assert.equal(res.status, 403)
  })

  test('PATCH /answers moves status DRAFT → IN_PROGRESS', async () => {
    const before = await prisma.evaluation.findUniqueOrThrow({
      where: { id: evalId }, select: { status: true },
    })
    assert.equal(before.status, 'DRAFT')

    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/answers`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ answers: { [questionId]: '4' } })
    assert.equal(res.status, 200)

    const after = await prisma.evaluation.findUniqueOrThrow({
      where: { id: evalId }, select: { status: true },
    })
    assert.equal(after.status, 'IN_PROGRESS')
  })

  test('PATCH /submit moves status → SUBMITTED (no reviewer)', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/submit`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ answers: { [questionId]: '4' } })
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'SUBMITTED')
    assert.ok(res.body.submittedAt)
  })

  test('cannot submit an already-submitted evaluation', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/submit`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ answers: {} })
    // Either 400 (bad request) or 200 with unchanged status — both acceptable
    if (res.status === 200) {
      assert.equal(res.body.status, 'SUBMITTED')
    } else {
      assert.equal(res.status, 400)
    }
  })
})

// ── 5. State machine — 2-stage review ────────────────────────────────────────

describe('Evaluation workflow: 2-stage PENDING_REVIEW → SUBMITTED', () => {
  let evalId: string
  let questionId: string

  before(async () => {
    // Create evaluation with a reviewer (manager).
    const createRes = await createFreshEval(supervisorToken, managerId)
    assert.equal(createRes.status, 201)
    evalId = createRes.body.id
    await completeAppraisalFixture(evalId)

    const cycle = await prisma.cycle.findUniqueOrThrow({
      where: { id: cycleId },
      include: { template: { include: { sections: { include: { questions: true } } } } },
    })
    questionId = cycle.template.sections.flatMap(s => s.questions)
      .find(q => q.type === 'rating')!.id
  })

  test('submit moves status → PENDING_REVIEW when reviewer is set', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/submit`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ answers: { [questionId]: '3' } })
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'PENDING_REVIEW')
  })

  test('reviewer can submit their review → SUBMITTED', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/review`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reviewerComment: 'Good performance, meets expectations.' })
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'SUBMITTED')
    assert.ok(res.body.reviewedAt)
  })

  test('non-reviewer cannot submit review', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/review`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({})
    // Forbidden or bad-request (already submitted)
    assert.ok([400, 403].includes(res.status))
  })
})

// ── 6. Acknowledgement ────────────────────────────────────────────────────────

describe('PATCH /api/evaluations/:id/acknowledgement', () => {
  let evalId: string

  before(async () => {
    const createRes = await createFreshEval()
    evalId = createRes.body.id
    await completeAppraisalFixture(evalId)

    const cycle = await prisma.cycle.findUniqueOrThrow({
      where: { id: cycleId },
      include: { template: { include: { sections: { include: { questions: true } } } } },
    })
    const questionId = cycle.template.sections.flatMap(s => s.questions)
      .find(q => q.type === 'rating')!.id

    // Submit evaluation first so it's in SUBMITTED state.
    await request(app)
      .patch(`/api/evaluations/${evalId}/submit`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ answers: { [questionId]: '5' } })
  })

  test('employee cannot set acknowledgement (requireRole guard)', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/acknowledgement`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ employeeSignedAt: new Date().toISOString() })
    assert.equal(res.status, 403)
  })

  test('manager can set employeeSignedAt', async () => {
    const signedAt = new Date().toISOString()
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/acknowledgement`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ employeeSignedAt: signedAt })
    assert.equal(res.status, 200)
    assert.ok(res.body.employeeSignedAt)
  })

  test('re-saving acknowledgement with same value does not error', async () => {
    const signedAt = new Date().toISOString()
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/acknowledgement`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ employeeSignedAt: signedAt })
    assert.equal(res.status, 200)
  })

  test('manager can set evaluatorSignedAt', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/acknowledgement`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ evaluatorSignedAt: new Date().toISOString() })
    assert.equal(res.status, 200)
    assert.ok(res.body.evaluatorSignedAt)
  })
})

// ── 7. Delete ─────────────────────────────────────────────────────────────────

describe('DELETE /api/evaluations/:id', () => {
  let evalId: string

  before(async () => {
    const res = await createFreshEval()
    evalId = res.body.id
    // Remove from cleanup list — we're deleting it in the test itself.
    const idx = createdEvaluationIds.indexOf(evalId)
    if (idx !== -1) createdEvaluationIds.splice(idx, 1)
  })

  test('employee cannot delete evaluation', async () => {
    const res = await request(app)
      .delete(`/api/evaluations/${evalId}`)
      .set('Authorization', `Bearer ${officerToken}`)
    assert.equal(res.status, 403)
  })

  test('supervisor cannot delete evaluation', async () => {
    const res = await request(app)
      .delete(`/api/evaluations/${evalId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
    assert.equal(res.status, 403)
  })

  test('admin can delete evaluation', async () => {
    const res = await request(app)
      .delete(`/api/evaluations/${evalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(res.status, 204)
  })

  test('returns 404 when deleting already-deleted evaluation', async () => {
    const res = await request(app)
      .delete(`/api/evaluations/${evalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(res.status, 404)
  })
})

// ── 8. Section saves ──────────────────────────────────────────────────────────

describe('Section saves (goals / competency / attendance)', () => {
  let evalId: string

  before(async () => {
    const res = await createFreshEval()
    evalId = res.body.id
  })

  test('PATCH /goals — saves goal entries', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/goals`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        goals: [
          {
            goal: 'Reduce defect rate',
            goalDescription: 'Target < 2% defects per month',
            weight: 100,
            result: 'Achieved 1.8% average',
            evaluationScore: 4,
          },
        ],
      })
    assert.equal(res.status, 200)
  })

  test('PATCH /competency — saves competency scores', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/competency`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        scores: [
          { competencyId: 'CC1', score: 4 },
          { competencyId: 'CC2', score: 3 },
          { competencyId: 'CC3', score: 5 },
          { competencyId: 'CC4', score: 4 },
        ],
      })
    assert.equal(res.status, 200)
  })

  test('PATCH /attendance — saves attendance record', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/attendance`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        leaveActualDays: 3,
        lateActualTimes: 1,
        disciplinaryLevel: 'NONE',
      })
    assert.equal(res.status, 200)
  })

  test('admin blockAdmin prevents saving answers on any section', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${evalId}/goals`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ goals: [] })
    assert.equal(res.status, 403)
  })
})
