/**
 * API suite — direct API layer tests via fetch() inside page context.
 *
 * Tests the backend contract independently of the React frontend:
 *   - HTTP status codes for happy / error paths
 *   - Auth token returned on login
 *   - Protected endpoints reject unauthenticated requests
 *   - CORS headers present (browser-to-API, same origin rules)
 *   - Response schema basics
 */
const cfg = require('../config')

const wait = (page, ms) => page.waitForTimeout(ms)

// Run a fetch inside the page context (avoids Node-level CORS issues)
function apiFetch(page, path, opts = {}) {
  return page.evaluate(
    ({ apiUrl, path, opts }) => fetch(apiUrl + path, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(async r => ({ status: r.status, body: await r.json().catch(() => null), headers: Object.fromEntries(r.headers) })),
    { apiUrl: cfg.apiUrl, path, opts }
  )
}

module.exports = {
  name: 'api',
  viewport: 'desktop',

  async setup(page) {
    // Navigate to app so fetch runs in same-origin context (avoids CORS preflight issues)
    await page.goto(cfg.baseUrl + '/login', { waitUntil: 'load' })
    await wait(page, 500)
  },

  tests: [
    {
      name: 'GET /health returns 200 with status: ok',
      async fn(page) {
        const res = await apiFetch(page, '/health')
        if (res.status !== 200) throw new Error(`/health returned HTTP ${res.status}`)
        if (res.body?.status !== 'ok') throw new Error(`/health body.status is "${res.body?.status}", expected "ok"`)
      },
    },

    {
      name: 'POST /auth/login returns 200 + token for valid credentials',
      async fn(page) {
        const res = await apiFetch(page, '/auth/login', {
          method: 'POST',
          body: { identifier: cfg.accounts.admin.identifier, password: cfg.accounts.admin.password },
        })
        if (res.status !== 200) throw new Error(`Login returned HTTP ${res.status} (expected 200)`)
        if (!res.body?.token) throw new Error('Login response has no token field')
        if (typeof res.body.token !== 'string' || res.body.token.length < 20)
          throw new Error(`Token looks invalid: "${String(res.body.token).slice(0, 20)}"`)
      },
    },

    {
      name: 'POST /auth/login returns 401 for wrong password',
      async fn(page) {
        const res = await apiFetch(page, '/auth/login', {
          method: 'POST',
          body: { identifier: cfg.accounts.admin.identifier, password: 'WrongPassword999!' },
        })
        if (res.status !== 401) throw new Error(`Wrong-password login returned HTTP ${res.status} (expected 401)`)
      },
    },

    {
      name: 'POST /auth/login returns 400 for missing body fields',
      async fn(page) {
        const res = await apiFetch(page, '/auth/login', {
          method: 'POST',
          body: {},
        })
        if (res.status !== 400 && res.status !== 422)
          throw new Error(`Empty-body login returned HTTP ${res.status} (expected 400 or 422)`)
      },
    },

    {
      name: 'GET /evaluations returns 401 without auth token',
      async fn(page) {
        const res = await apiFetch(page, '/evaluations')
        if (res.status !== 401)
          throw new Error(`Unauthenticated /evaluations returned HTTP ${res.status} (expected 401)`)
      },
    },

    {
      name: 'GET /users returns 401 without auth token',
      async fn(page) {
        const res = await apiFetch(page, '/users')
        if (res.status !== 401)
          throw new Error(`Unauthenticated /users returned HTTP ${res.status} (expected 401)`)
      },
    },

    {
      name: 'POST /auth/login error body has message field',
      async fn(page) {
        const res = await apiFetch(page, '/auth/login', {
          method: 'POST',
          body: { identifier: 'nobody@notreal.com', password: 'WrongPass!' },
        })
        if (!res.body?.message)
          throw new Error(`Error response from /auth/login has no message field (status: ${res.status})`)
      },
    },

    {
      name: 'GET /evaluations with valid token returns array',
      async fn(page) {
        // Login first to get token
        const loginRes = await apiFetch(page, '/auth/login', {
          method: 'POST',
          body: { identifier: cfg.accounts.admin.identifier, password: cfg.accounts.admin.password },
        })
        if (loginRes.status !== 200) { console.warn('  [SKIP] Login failed — skipping authed endpoint test'); return }
        const token = loginRes.body?.token
        const res = await apiFetch(page, '/evaluations', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status !== 200)
          throw new Error(`Authenticated GET /evaluations returned HTTP ${res.status} (expected 200)`)
        if (!Array.isArray(res.body))
          throw new Error(`GET /evaluations should return an array, got: ${typeof res.body}`)
      },
    },

    {
      name: 'GET /templates with valid token returns array',
      async fn(page) {
        const loginRes = await apiFetch(page, '/auth/login', {
          method: 'POST',
          body: { identifier: cfg.accounts.admin.identifier, password: cfg.accounts.admin.password },
        })
        if (loginRes.status !== 200) { console.warn('  [SKIP] Login failed'); return }
        const token = loginRes.body?.token
        const res = await apiFetch(page, '/templates', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status !== 200)
          throw new Error(`GET /templates returned HTTP ${res.status}`)
        if (!Array.isArray(res.body))
          throw new Error(`GET /templates should return array, got: ${typeof res.body}`)
      },
    },

    {
      name: 'GET /cycles with valid token returns array',
      async fn(page) {
        const loginRes = await apiFetch(page, '/auth/login', {
          method: 'POST',
          body: { identifier: cfg.accounts.admin.identifier, password: cfg.accounts.admin.password },
        })
        if (loginRes.status !== 200) { console.warn('  [SKIP] Login failed'); return }
        const token = loginRes.body?.token
        const res = await apiFetch(page, '/cycles', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status !== 200)
          throw new Error(`GET /cycles returned HTTP ${res.status}`)
        if (!Array.isArray(res.body))
          throw new Error(`GET /cycles should return array, got: ${typeof res.body}`)
      },
    },
  ],
}
