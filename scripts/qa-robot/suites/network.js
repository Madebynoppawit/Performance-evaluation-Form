/**
 * Network suite — intercepts browser network traffic while walking the app.
 *
 * Drives the real UI (authenticated) across every key page and records:
 *   - every /api/* response status (asserts none are 4xx/5xx or network errors)
 *   - uncaught console errors + page errors
 *   - failed external (non-API) resource requests, e.g. CDN fonts
 *
 * The page is shared across a suite's tests, so the first test does the walk
 * once and stashes the capture for the remaining assertions to read.
 */
const cfg = require('../config')
const { login } = require('../lib/browser')

const wait = (page, ms) => page.waitForTimeout(ms)

const PAGES = [
  '/', '/evaluations', '/templates', '/cycles', '/reports',
  '/calibration', '/users', '/data', '/account', '/settings',
]

const stripHost = (u) => u.replace(/^https?:\/\/[^/]+/, '')
const hostOf = (u) => (u.match(/^https?:\/\/([^/]+)/) || [])[1] || ''

// Populated by the first test, reused by the rest within a single run.
let cap = null

async function walk(page) {
  const apiCalls = []
  const apiFailures = []
  const consoleErrors = []
  const externalFailures = []

  const onResp = (r) => {
    const u = r.url()
    if (!u.includes('/api/')) return
    const rec = { method: r.request().method(), path: stripHost(u).split('?')[0], status: r.status() }
    apiCalls.push(rec)
    if (r.status() >= 400) apiFailures.push(rec)
  }
  const onFail = (r) => {
    const u = r.url()
    if (u.includes('/api/')) {
      apiFailures.push({ method: r.method(), path: stripHost(u).split('?')[0], status: `NETFAIL:${r.failure()?.errorText || '?'}` })
    } else {
      externalFailures.push({ host: hostOf(u), err: r.failure()?.errorText || '?' })
    }
  }
  const onConsole = (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) }
  const onPageErr = (e) => consoleErrors.push(`[pageerror] ${e.message.slice(0, 200)}`)

  page.on('response', onResp)
  page.on('requestfailed', onFail)
  page.on('console', onConsole)
  page.on('pageerror', onPageErr)

  try {
    for (const path of PAGES) {
      await page.goto(cfg.baseUrl + path, { waitUntil: 'load' }).catch(() => {})
      await wait(page, 1100) // let React Query fire the page's API calls
    }
  } finally {
    page.off('response', onResp)
    page.off('requestfailed', onFail)
    page.off('console', onConsole)
    page.off('pageerror', onPageErr)
  }

  return { apiCalls, apiFailures, consoleErrors, externalFailures }
}

module.exports = {
  name: 'network',
  viewport: 'desktop',

  // Only invoked when the runner has no pre-seeded session (otherwise page is already authed).
  async setup(page) {
    const { ok, error } = await login(page, cfg.accounts.admin)
    if (!ok) throw new Error(`Network suite: login failed in setup — ${error}`)
  },

  tests: [
    {
      name: 'API requests all succeed across key pages (no 4xx/5xx/network error)',
      async fn(page) {
        cap = await walk(page)
        if (cap.apiCalls.length === 0) {
          throw new Error('No /api/* calls observed while walking the app — frontend may not be reaching the backend')
        }
        if (cap.apiFailures.length > 0) {
          const lines = cap.apiFailures.map(f => `${f.method} ${f.path} -> ${f.status}`).join('; ')
          throw new Error(`${cap.apiFailures.length} failed API request(s) across ${PAGES.length} pages: ${lines}`)
        }
      },
    },

    {
      name: 'No uncaught console or page errors across key pages',
      async fn(page) {
        if (!cap) cap = await walk(page)
        if (cap.consoleErrors.length > 0) {
          throw new Error(`${cap.consoleErrors.length} console/page error(s): ${cap.consoleErrors.slice(0, 4).join(' | ')}`)
        }
      },
    },

    {
      name: 'No failed external CDN/resource requests',
      async fn(page) {
        if (!cap) cap = await walk(page)
        const hosts = [...new Set(cap.externalFailures.map(f => f.host))].filter(Boolean)
        if (hosts.length > 0) {
          throw new Error(`External resource requests failed from: ${hosts.join(', ')} — consider self-hosting (non-app runtime dependency)`)
        }
      },
    },
  ],
}
