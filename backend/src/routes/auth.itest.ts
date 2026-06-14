/**
 * Integration tests for auth endpoints.
 * Requires a running Postgres DB seeded with prisma/seed.cjs.
 * Run via: npm run test:integration -w backend
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { prisma } from '../lib/prisma.js'
import { createApp } from '../app.js'

const app = createApp()
const createdEmails: string[] = []

after(async () => {
  if (createdEmails.length) {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } })
  }
  await prisma.$disconnect()
})

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({})
    assert.equal(res.status, 400)
  })

  test('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@amw-ems.com', password: 'wrongpassword' })
    assert.equal(res.status, 401)
    assert.ok(res.body.message)
  })

  test('returns 401 for unknown identifier', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'nobody@amw-ems.com', password: 'P@ssw0rd!' })
    assert.equal(res.status, 401)
  })

  test('returns 200 with token and safe user on valid email login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@amw-ems.com', password: 'P@ssw0rd!' })
    assert.equal(res.status, 200)
    assert.ok(res.body.token, 'JWT token should be present')
    assert.equal(res.body.user.email, 'admin@amw-ems.com')
    assert.equal(res.body.user.password, undefined, 'password must not be exposed')
  })

  test('returns 200 when logging in with employee number', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'MGR-001', password: 'P@ssw0rd!' })
    assert.equal(res.status, 200)
    assert.ok(res.body.token)
  })

  test('accepts legacy `email` field (back-compat)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@amw-ems.com', password: 'P@ssw0rd!' })
    assert.equal(res.status, 200)
    assert.ok(res.body.token)
  })
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let token: string

  before(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@amw-ems.com', password: 'P@ssw0rd!' })
    token = res.body.token as string
  })

  test('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/auth/me')
    assert.equal(res.status, 401)
  })

  test('returns 401 for a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token')
    assert.equal(res.status, 401)
  })

  test('returns profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.email, 'admin@amw-ems.com')
    assert.equal(res.body.password, undefined)
    assert.ok(res.body.role)
  })
})

// ── POST /api/auth/register ───────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('creates a new account and returns a token', async () => {
    const email = `itest.reg.${Date.now()}@amw-ems.com`
    createdEmails.push(email)
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Test@1234', name: 'Integration Test User' })
    assert.equal(res.status, 201)
    assert.ok(res.body.token)
    assert.equal(res.body.user.email, email)
    assert.equal(res.body.user.password, undefined)
  })

  test('returns 409 for duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'admin@amw-ems.com', password: 'Test@1234', name: 'Dup' })
    assert.equal(res.status, 409)
  })

  test('returns 400 for weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `itest.weak.${Date.now()}@amw-ems.com`, password: 'weak', name: 'Weak' })
    assert.equal(res.status, 400)
  })

  test('returns 400 for non-company email domain', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@gmail.com', password: 'Test@1234', name: 'External' })
    assert.equal(res.status, 400)
  })
})

// ── GET /api/evaluations ──────────────────────────────────────────────────────

describe('GET /api/evaluations', () => {
  let adminToken: string

  before(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@amw-ems.com', password: 'P@ssw0rd!' })
    adminToken = res.body.token as string
  })

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/evaluations')
    assert.equal(res.status, 401)
  })

  test('returns an array for authenticated admin', async () => {
    const res = await request(app)
      .get('/api/evaluations')
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body), 'body should be an array')
  })
})

// ── GET /api/health ───────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  test('returns 200 with database ok', async () => {
    const res = await request(app).get('/api/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'ok')
    assert.equal(res.body.services.database, 'ok')
  })
})
