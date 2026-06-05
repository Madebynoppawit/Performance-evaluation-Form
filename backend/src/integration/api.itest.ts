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

  it('sets production security headers', async () => {
    const res = await request(app).get('/health')

    assert.equal(res.headers['x-powered-by'], undefined)
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
    assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN')
    assert.ok(res.headers['content-security-policy'])
  })

  it('returns JSON for unknown routes', async () => {
    const res = await request(app).get('/api/not-a-real-route')

    assert.equal(res.status, 404)
    assert.equal(res.type, 'application/json')
    assert.deepEqual(res.body, {
      message: 'Route not found',
      method: 'GET',
      path: '/api/not-a-real-route',
    })
  })

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@company.com', password: 'definitely-wrong' })
    assert.equal(res.status, 401)
  })

  it('logs in an admin and returns a token + user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@company.com', password: PASSWORD })
    assert.equal(res.status, 200)
    assert.ok(res.body.token, 'expected a JWT token')
    assert.equal(res.body.user.role, 'ADMIN')
  })

  it('requires authentication for protected routes', async () => {
    const res = await request(app).get('/api/templates')
    assert.equal(res.status, 401)
  })

  it('lists templates for an authenticated admin', async () => {
    const token = await loginAs('admin@company.com')
    const res = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${token}`)
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body))
  })

  it('forbids a non-admin from creating templates (RBAC)', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'officer1@company.com', password: PASSWORD })
    assert.equal(login.status, 200)
    assert.notEqual(login.body.user.role, 'ADMIN')

    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ name: 'Should be blocked', type: 'SELF' })
    assert.equal(res.status, 403)
  })

  it('rejects invalid acknowledgement signer types', async () => {
    const token = await loginAs('admin@company.com')
    const evaluationId = await firstEvaluationId(token)

    const res = await request(app)
      .post(`/api/evaluations/${evaluationId}/acknowledge`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signerType: 'board' })

    assert.equal(res.status, 400)
    assert.ok(res.body.errors.signerType)
  })

  it('prevents evaluatees from signing director acknowledgement', async () => {
    const token = await loginAs('officer1@company.com')
    const evaluationId = await firstEvaluationId(token)

    const res = await request(app)
      .post(`/api/evaluations/${evaluationId}/acknowledge`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signerType: 'director' })

    assert.equal(res.status, 403)
  })
})
