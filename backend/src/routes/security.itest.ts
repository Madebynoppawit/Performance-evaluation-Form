/**
 * QA Security Integration Tests
 *
 * Covers: IDOR, JWT tampering, rate limiting, input injection,
 * privilege escalation, and sensitive data exposure.
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { prisma } from '../lib/prisma.js'
import { createApp } from '../app.js'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

const app = createApp()

// ── Shared state ──────────────────────────────────────────────────────────────

let officerToken: string
let supervisorToken: string
let officerId: string
let supervisorId: string
let seededEvalId: string   // owned by manager → officer; officer is evaluatee

before(async () => {
  const [officer, supervisor, manager, seededEval] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: 'officer1@amw-ems.com' }, select: { id: true } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'supervisor1@amw-ems.com' }, select: { id: true } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'manager.eng@amw-ems.com' }, select: { id: true } }),
    prisma.evaluation.findFirst({
      where: {
        evaluatee: { email: 'officer1@amw-ems.com' },
        evaluator: { email: 'manager.eng@amw-ems.com' },
      },
      select: { id: true },
    }),
  ])

  officerId    = officer.id
  supervisorId = supervisor.id
  seededEvalId = seededEval?.id ?? ''

  async function loginFor(email: string) {
    const res = await request(app).post('/api/auth/login').send({ identifier: email, password: 'P@ssw0rd!' })
    return res.body.token as string
  }
  ;[officerToken, supervisorToken] = await Promise.all([
    loginFor('officer1@amw-ems.com'),
    loginFor('supervisor1@amw-ems.com'),
  ])
})

after(async () => {
  await prisma.$disconnect()
})

// ── 1. IDOR (Insecure Direct Object Reference) ───────────────────────────────

describe('IDOR — accessing other users\' data', () => {
  test('supervisor cannot access evaluation they are not part of', async () => {
    if (!seededEvalId) return  // skip if seed not present

    // supervisor1 is NOT evaluator/evaluatee of the seeded manager→officer eval
    const isSupervisorParticipant = await prisma.evaluation.findFirst({
      where: {
        id: seededEvalId,
        OR: [{ evaluatorId: supervisorId }, { evaluateeId: supervisorId }, { reviewerId: supervisorId }],
      },
    })
    if (isSupervisorParticipant) return  // supervisor happens to be a participant — skip

    const res = await request(app)
      .get(`/api/evaluations/${seededEvalId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
    assert.equal(res.status, 403, 'non-participant must be denied with 403')
  })

  test('employee cannot access another employee\'s evaluation', async () => {
    // Create an eval that officer is NOT a participant of
    const otherEval = await prisma.evaluation.findFirst({
      where: {
        AND: [
          { evaluateeId: { not: officerId } },
          { evaluatorId: { not: officerId } },
          { reviewerId: { not: officerId } },
        ],
      },
      select: { id: true },
    })
    if (!otherEval) return  // no unrelated eval in DB — skip

    const res = await request(app)
      .get(`/api/evaluations/${otherEval.id}`)
      .set('Authorization', `Bearer ${officerToken}`)
    assert.equal(res.status, 403, 'employee must not access unrelated evaluation')
  })

  test('employee cannot delete another user\'s evaluation', async () => {
    if (!seededEvalId) return

    const res = await request(app)
      .delete(`/api/evaluations/${seededEvalId}`)
      .set('Authorization', `Bearer ${officerToken}`)
    assert.equal(res.status, 403)
  })

  test('unauthenticated request cannot read any evaluation', async () => {
    if (!seededEvalId) return

    const res = await request(app).get(`/api/evaluations/${seededEvalId}`)
    assert.equal(res.status, 401)
  })
})

// ── 2. JWT Tampering ──────────────────────────────────────────────────────────

describe('JWT tampering — forged / malformed tokens', () => {
  test('completely fake token is rejected', async () => {
    const res = await request(app)
      .get('/api/evaluations')
      .set('Authorization', 'Bearer this.is.fake')
    assert.equal(res.status, 401)
  })

  test('valid structure but wrong signature is rejected', async () => {
    // Take a real token and corrupt the signature segment.
    const parts = officerToken.split('.')
    parts[2] = parts[2].split('').reverse().join('')
    const tampered = parts.join('.')

    const res = await request(app)
      .get('/api/evaluations')
      .set('Authorization', `Bearer ${tampered}`)
    assert.equal(res.status, 401)
  })

  test('token with role elevated to ADMIN in payload is rejected', async () => {
    // Forge a payload claiming ADMIN — but sign it with the WRONG secret.
    const fakeHeader  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const fakePayload = Buffer.from(JSON.stringify({ userId: officerId, role: 'ADMIN', iat: Math.floor(Date.now()/1000) })).toString('base64url')
    const fakeToken   = `${fakeHeader}.${fakePayload}.invalidsignature`

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${fakeToken}`)
    assert.equal(res.status, 401)
  })

  test('expired token is rejected', async () => {
    // Sign a token that expired 1 second ago using the real secret.
    const expiredToken = jwt.sign(
      { userId: officerId, role: 'EMPLOYEE' },
      env.JWT_SECRET,
      { expiresIn: -1 },
    )
    const res = await request(app)
      .get('/api/evaluations')
      .set('Authorization', `Bearer ${expiredToken}`)
    assert.equal(res.status, 401)
  })

  test('token missing Bearer prefix is rejected', async () => {
    const res = await request(app)
      .get('/api/evaluations')
      .set('Authorization', officerToken)  // no "Bearer " prefix
    assert.equal(res.status, 401)
  })

  test('empty Authorization header is rejected', async () => {
    const res = await request(app)
      .get('/api/evaluations')
      .set('Authorization', '')
    assert.equal(res.status, 401)
  })
})

// ── 3. Privilege Escalation ───────────────────────────────────────────────────

describe('Privilege escalation — role-gated endpoints', () => {
  test('employee cannot access user management (admin only)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${officerToken}`)
    assert.equal(res.status, 403)
  })

  test('supervisor cannot delete evaluations (admin only)', async () => {
    if (!seededEvalId) return

    const res = await request(app)
      .delete(`/api/evaluations/${seededEvalId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
    assert.equal(res.status, 403)
  })

  test('employee cannot create evaluations (supervisory role required)', async () => {
    const cycle = await prisma.cycle.findFirst({ select: { id: true } })
    if (!cycle) return

    const res = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ cycleId: cycle.id, evaluatorId: officerId, type: 'SELF', evaluateeId: officerId })
    assert.equal(res.status, 403)
  })

  test('employee cannot set salary summary (manager/developer only)', async () => {
    if (!seededEvalId) return

    const res = await request(app)
      .patch(`/api/evaluations/${seededEvalId}/salary`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ oldSalary: 50000, newSalary: 60000 })
    assert.equal(res.status, 403)
  })
})

// ── 4. Input Injection ────────────────────────────────────────────────────────

describe('Input injection — SQL / NoSQL / XSS payloads in inputs', () => {
  const injectionPayloads = [
    "' OR '1'='1",
    '"; DROP TABLE users; --',
    '${7*7}',
    '<script>alert(1)</script>',
    '\\x00\\x1f',
    'A'.repeat(10_000),
  ]

  for (const payload of injectionPayloads) {
    test(`login with injection payload does not crash server: ${payload.slice(0, 40)}`, async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: payload, password: payload })
      // Must return 400 or 401 — never 500
      assert.ok(
        res.status < 500,
        `Server returned ${res.status} for payload: ${payload.slice(0, 40)}`,
      )
    })
  }

  test('registration with XSS in name field is stored safely (no 500)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `xss.test.${Date.now()}@amw-ems.com`,
        password: 'Test@1234',
        name: '<img src=x onerror=alert(1)>',
      })
    // 201 is fine (Prisma stores the raw string — output escaping is the frontend's job)
    // 400 (zod rejects) is also fine. Never 500.
    assert.ok(res.status < 500)
    if (res.status === 201) {
      // Cleanup
      await prisma.user.deleteMany({ where: { email: { contains: 'xss.test' } } })
    }
  })

  test('extremely long email does not crash server', async () => {
    const longEmail = `${'a'.repeat(300)}@amw-ems.com`
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: longEmail, password: 'anything' })
    assert.ok(res.status < 500)
  })
})

// ── 5. Sensitive Data Exposure ────────────────────────────────────────────────

describe('Sensitive data exposure', () => {
  test('password hash is never returned from login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'officer1@amw-ems.com', password: 'P@ssw0rd!' })
    assert.equal(res.status, 200)
    const body = JSON.stringify(res.body)
    assert.ok(!body.includes('$2'), 'bcrypt hash must not appear in response')
    assert.equal(res.body.user?.password, undefined)
  })

  test('password hash is never returned from /me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${officerToken}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.password, undefined)
    const body = JSON.stringify(res.body)
    assert.ok(!body.includes('$2'))
  })

  test('password hash is never returned from user list (admin)', async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@amw-ems.com', password: 'P@ssw0rd!' })
    const adminToken = adminRes.body.token

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(res.status, 200)
    const body = JSON.stringify(res.body)
    assert.ok(!body.includes('$2'), 'bcrypt hash must not appear in user list')
  })

  test('X-Powered-By header is removed (fingerprinting prevention)', async () => {
    const res = await request(app).get('/health')
    assert.equal(res.headers['x-powered-by'], undefined)
  })

  test('API responses include no-store cache header', async () => {
    const res = await request(app)
      .get('/api/evaluations')
      .set('Authorization', `Bearer ${officerToken}`)
    assert.match(res.headers['cache-control'] ?? '', /no-store/)
  })
})

// ── 6. Rate Limiting ──────────────────────────────────────────────────────────

describe('Rate limiting — auth endpoint', () => {
  test('repeated failed logins eventually get rate-limited (429)', async () => {
    // The seeded .env.test sets RATE_LIMIT_MAX=20 for the auth limiter.
    // Fire 25 requests to confirm the limiter activates somewhere in that range.
    let got429 = false
    for (let i = 0; i < 25; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: `nosuchuser${i}@amw-ems.com`, password: 'wrong' })
      if (res.status === 429) { got429 = true; break }
    }
    assert.ok(got429, 'Auth rate limiter must return 429 after threshold is exceeded')
  })
})
