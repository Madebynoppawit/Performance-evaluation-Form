/**
 * Performance checks — page load times, API response times.
 */
const cfg  = require('../config')
const { login } = require('../lib/browser')

const wait = (page, ms) => page.waitForTimeout(ms)

const THRESHOLDS = {
  pageLoad: 4000,  // ms — page should be interactive within this time
  apiHealth: 1000, // ms — health endpoint
}

async function measureLoad(page, path) {
  const start = Date.now()
  await page.goto(cfg.baseUrl + path, { waitUntil: 'networkidle' })
  return Date.now() - start
}

module.exports = {
  name: 'performance',
  viewport: 'desktop',

  async setup(page) {
    const { ok } = await login(page, cfg.accounts.admin)
    if (!ok) throw new Error('Performance suite: login failed in setup')
  },

  tests: [
    {
      name: `Dashboard loads within ${THRESHOLDS.pageLoad}ms`,
      async fn(page) {
        const ms = await measureLoad(page, '/')
        if (ms > THRESHOLDS.pageLoad) throw new Error(`Dashboard took ${ms}ms (threshold: ${THRESHOLDS.pageLoad}ms)`)
      },
    },

    {
      name: `Evaluations list loads within ${THRESHOLDS.pageLoad}ms`,
      async fn(page) {
        const ms = await measureLoad(page, '/evaluations')
        if (ms > THRESHOLDS.pageLoad) throw new Error(`Evaluations took ${ms}ms (threshold: ${THRESHOLDS.pageLoad}ms)`)
      },
    },

    {
      name: `Reports page loads within ${THRESHOLDS.pageLoad + 2000}ms`,
      async fn(page) {
        const ms = await measureLoad(page, '/reports')
        const limit = THRESHOLDS.pageLoad + 2000
        if (ms > limit) throw new Error(`Reports took ${ms}ms (threshold: ${limit}ms — heavier page)`)
      },
    },

    {
      name: `Health API responds within ${THRESHOLDS.apiHealth}ms`,
      async fn(page) {
        const start = Date.now()
        const res = await page.evaluate(async (url) => {
          const r = await fetch(url)
          return { status: r.status }
        }, cfg.apiUrl + '/health')
        const ms = Date.now() - start
        if (res.status !== 200) throw new Error(`Health API returned ${res.status}`)
        if (ms > THRESHOLDS.apiHealth) throw new Error(`Health API took ${ms}ms (threshold: ${THRESHOLDS.apiHealth}ms)`)
      },
    },

    {
      name: 'No JavaScript errors on dashboard',
      async fn(page) {
        const errors = []
        page.on('pageerror', e => errors.push(e.message))
        await page.goto(cfg.baseUrl + '/', { waitUntil: 'networkidle' })
        await wait(page, 1000)
        if (errors.length > 0) throw new Error(`${errors.length} JS errors: ${errors[0].slice(0, 200)}`)
      },
    },

    {
      name: 'No 5xx API errors during normal navigation',
      async fn(page) {
        const serverErrors = []
        page.on('response', r => {
          if (r.status() >= 500 && r.url().includes(cfg.apiUrl.replace('http://', '')))
            serverErrors.push(`${r.status()} ${r.url()}`)
        })
        for (const path of ['/', '/evaluations', '/reports', '/cycles']) {
          await page.goto(cfg.baseUrl + path, { waitUntil: 'load' })
          await wait(page, 1000)
        }
        if (serverErrors.length > 0) throw new Error(`5xx errors detected: ${serverErrors.join(', ')}`)
      },
    },
  ],
}
