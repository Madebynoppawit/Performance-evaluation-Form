import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import request from 'supertest'
import { createApp } from '../app'
import { prisma } from '../lib/prisma'

/* HTTP integration tests against the real Express app + a seeded Postgres.
   Requires a migrated & seeded test database (see CI / README).
   Run with: npm run test:integration */

const app = createApp()
const PASSWORD = 'P@ssw0rd!'

async function loginAs(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD })
  assert.equal(res.status, 200)
  return res.body.token as string
}

async function firstEvaluationId(token: string) {
  const res = await request(app).get('/api/evaluations').set('Authorization', `Bearer ${token}`)
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body))
  assert.ok(res.body.length > 0, 'expected seeded evaluations')
  return res.body[0].id as string
}

describe('API integration', () => {
  after(async () => {
    await prisma.$disconnect()
  })

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'ok')
  })

  it('GET /api/ready returns dependency readiness', async () => {
    const res = await request(app).get('/api/ready')

    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'ok')
    assert.equal(res.body.services.api, 'ok')
    assert.equal(res.body.services.auth, 'ok')
    assert.equal(res.body.services.database, 'ok')
    assert.ok(res.body.requestId)
  })

  it('sets production security headers', async () => {
    const res = await request(app).get('/health')

    assert.equal(res.headers['x-powered-by'], undefined)
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
    assert.match(res.headers['content-security-policy'], /frame-ancestors 'none'/)
    assert.match(res.headers['content-security-policy'], /object-src 'none'/)
  })

  it('adds no-store and request id headers to API responses', async () => {
    const res = await request(app)
      .get('/api/not-a-real-route')
      .set('X-Request-Id', 'itest-request-123')

    assert.equal(res.headers['x-request-id'], 'itest-request-123')
    assert.equal(res.headers['cache-control'], 'no-store, no-cache, must-revalidate, private')
    assert.equal(res.headers.pragma, 'no-cache')
  })

  it('returns JSON for unknown routes', async () => {
    const res = await request(app).get('/api/not-a-real-route')

    assert.equal(res.status, 404)
    assert.equal(res.type, 'application/json')
    assert.equal(res.body.message, 'Route not found')
    assert.equal(res.body.method, 'GET')
    assert.equal(res.body.path, '/api/not-a-real-route')
    assert.ok(res.body.requestId)
  })

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@amw-ems.com', password: 'definitely-wrong' })
    assert.equal(res.status, 401)
  })

  it('logs in an admin and returns a token + user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ADMIN@AMW-EMS.COM', password: PASSWORD })
    assert.equal(res.status, 200)
    assert.ok(res.body.token, 'expected a JWT token')
    assert.equal(res.body.user.role, 'ADMIN')
  })

  it('rejects public registration outside the company email domain', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'someone@gmail.com',
        password: PASSWORD,
        name: 'External User',
        department: 'External',
      })

    assert.equal(res.status, 400)
    assert.ok(res.body.errors.email)
  })

  it('requires authentication for protected routes', async () => {
    const res = await request(app).get('/api/templates')
    assert.equal(res.status, 401)
  })

  it('lists templates for an authenticated admin', async () => {
    const token = await loginAs('admin@amw-ems.com')
    const res = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${token}`)
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body))
  })

  it('forbids a non-admin from creating templates (RBAC)', async () => {
    const token = await loginAs('officer1@amw-ems.com')

    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should be blocked', type: 'SELF' })
    assert.equal(res.status, 403)
  })

  it('allows managers to view reports but denies employees (RBAC)', async () => {
    const managerToken = await loginAs('manager.eng@amw-ems.com')
    const employeeToken = await loginAs('officer1@amw-ems.com')

    const manager = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${managerToken}`)
    assert.equal(manager.status, 200)

    const employee = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${employeeToken}`)
    assert.equal(employee.status, 403)
  })

  it('denies managers access to admin-only user management (RBAC)', async () => {
    const managerToken = await loginAs('manager.eng@amw-ems.com')
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${managerToken}`)

    assert.equal(res.status, 403)
  })

  it('allows managers to create cycles but not change cycle status (RBAC)', async () => {
    const adminToken = await loginAs('admin@amw-ems.com')
    const managerToken = await loginAs('manager.eng@amw-ems.com')

    const templates = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(templates.status, 200)
    assert.ok(templates.body.length > 0)

    const create = await request(app)
      .post('/api/cycles')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: `RBAC Smoke ${Date.now()}`,
        templateId: templates.body[0].id,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })
    assert.equal(create.status, 201)

    const status = await request(app)
      .patch(`/api/cycles/${create.body.id}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'CLOSED' })
    assert.equal(status.status, 403)
  })

  it('exports an accessible evaluation as CSV', async () => {
    const token = await loginAs('admin@amw-ems.com')
    const evaluationId = await firstEvaluationId(token)

    const res = await request(app)
      .get(`/api/reports/evaluations/${evaluationId}/export`)
      .set('Authorization', `Bearer ${token}`)

    assert.equal(res.status, 200)
    assert.match(res.headers['content-type'], /text\/csv/)
    assert.match(res.headers['content-disposition'], /attachment; filename="evaluation-/)
    assert.match(res.text, /"Section","Field","Value"/)
    assert.match(res.text, /"Evaluation","ID"/)
    assert.match(res.text, /"Scores","Total Score"/)
  })

  it('rejects invalid acknowledgement timestamps', async () => {
    const token = await loginAs('manager.eng@amw-ems.com')
    const evaluationId = await firstEvaluationId(token)

    const res = await request(app)
      .patch(`/api/evaluations/${evaluationId}/acknowledgement`)
      .set('Authorization', `Bearer ${token}`)
      .send({ evaluatorSignedAt: 'not-a-date' })

    assert.equal(res.status, 400)
    assert.ok(res.body.errors.evaluatorSignedAt)
  })

  it('prevents evaluatees from editing acknowledgement timestamps', async () => {
    const token = await loginAs('officer1@amw-ems.com')
    const evaluationId = await firstEvaluationId(token)

    const res = await request(app)
      .patch(`/api/evaluations/${evaluationId}/acknowledgement`)
      .set('Authorization', `Bearer ${token}`)
      .send({ directorSignedAt: new Date().toISOString() })

    assert.equal(res.status, 403)
  })
})
