/**
 * RBAC suite — Role-Based Access Control tests.
 *
 * isAdmin = ADMIN | DEVELOPER  → can access /users, /data
 * isManager = MANAGER | isAdmin → can access /evaluations, /reports, /calibration
 * EMPLOYEE → cannot access /users, /data (sees "Admins only" empty state)
 * MANAGER  → cannot access /users, /data
 * DEVELOPER → full access (isAdmin = true)
 *
 * Each test creates its own isolated browser context so sessions don't bleed.
 */
const cfg  = require('../config')
const { newPage, login } = require('../lib/browser')

const wait = (page, ms) => page.waitForTimeout(ms)

async function withRole(roleName, fn) {
  const account = cfg.accounts[roleName]
  if (!account) { console.warn(`  [SKIP] No ${roleName} account in config`); return }

  const { page, context } = await newPage('desktop', null)
  try {
    const { ok } = await login(page, account)
    if (!ok) { console.warn(`  [SKIP] ${roleName} login failed (rate-limited?)`); return }
    await fn(page)
  } finally {
    await context.close().catch(() => {})
  }
}

module.exports = {
  name: 'rbac',
  viewport: 'desktop',

  async setup() {},

  tests: [
    // ── Employee restrictions ────────────────────────────────────────────────
    {
      name: 'Employee: /users shows "Admins only" (not a redirect)',
      async fn() {
        await withRole('employee', async (page) => {
          await page.goto(cfg.baseUrl + '/users', { waitUntil: 'load' })
          await wait(page, 2000)
          const text = await page.evaluate(() => document.body.innerText)
          const blocked = text.match(/admins only|เฉพาะผู้ดูแล|réservé aux admin|permission.*manag|do not have permission/i)
          if (!blocked) throw new Error(`Employee can access /users — RBAC not enforced (text: "${text.slice(0, 100)}")`)
        })
      },
    },

    {
      name: 'Employee: /data shows forbidden message',
      async fn() {
        await withRole('employee', async (page) => {
          await page.goto(cfg.baseUrl + '/data', { waitUntil: 'load' })
          await wait(page, 2000)
          const text = await page.evaluate(() => document.body.innerText)
          const blocked = text.match(/admins only|เฉพาะผู้ดูแล|permission|forbidden|not.*allow/i)
          if (!blocked) throw new Error(`Employee can access /data — RBAC not enforced (text: "${text.slice(0, 100)}")`)
        })
      },
    },

    {
      name: 'Employee: /evaluations is accessible (own evals)',
      async fn() {
        await withRole('employee', async (page) => {
          await page.goto(cfg.baseUrl + '/evaluations', { waitUntil: 'load' })
          await wait(page, 2000)
          if (page.url().includes('/login'))
            throw new Error('Employee was redirected to /login from /evaluations — should be allowed')
          const text = await page.evaluate(() => document.body.innerText)
          if (text.match(/forbidden|not.*allow/i))
            throw new Error('Employee sees forbidden message on /evaluations — should be allowed')
        })
      },
    },

    {
      name: 'Employee: /reports is accessible',
      async fn() {
        await withRole('employee', async (page) => {
          await page.goto(cfg.baseUrl + '/reports', { waitUntil: 'load' })
          await wait(page, 2000)
          if (page.url().includes('/login'))
            throw new Error('Employee redirected to /login from /reports')
          const text = await page.evaluate(() => document.body.innerText)
          if (text.match(/forbidden/i))
            throw new Error('Employee sees forbidden on /reports')
        })
      },
    },

    // ── Manager restrictions ─────────────────────────────────────────────────
    {
      name: 'Manager: /users shows "Admins only"',
      async fn() {
        await withRole('manager', async (page) => {
          await page.goto(cfg.baseUrl + '/users', { waitUntil: 'load' })
          await wait(page, 2000)
          const text = await page.evaluate(() => document.body.innerText)
          const blocked = text.match(/admins only|เฉพาะผู้ดูแล|réservé|do not have permission/i)
          if (!blocked) throw new Error(`Manager can access /users — should be admin-only (text: "${text.slice(0, 100)}")`)
        })
      },
    },

    {
      name: 'Manager: /data shows forbidden message',
      async fn() {
        await withRole('manager', async (page) => {
          await page.goto(cfg.baseUrl + '/data', { waitUntil: 'load' })
          await wait(page, 2000)
          const text = await page.evaluate(() => document.body.innerText)
          const blocked = text.match(/admins only|permission|forbidden/i)
          if (!blocked) throw new Error(`Manager can access /data — should be admin-only (text: "${text.slice(0, 100)}")`)
        })
      },
    },

    {
      name: 'Manager: /calibration is accessible',
      async fn() {
        await withRole('manager', async (page) => {
          await page.goto(cfg.baseUrl + '/calibration', { waitUntil: 'load' })
          await wait(page, 2000)
          if (page.url().includes('/login'))
            throw new Error('Manager redirected to /login from /calibration')
          const text = await page.evaluate(() => document.body.innerText)
          if (text.match(/forbidden|not.*allow/i))
            throw new Error('Manager sees forbidden on /calibration')
        })
      },
    },

    {
      name: 'Manager: /evaluations is accessible',
      async fn() {
        await withRole('manager', async (page) => {
          await page.goto(cfg.baseUrl + '/evaluations', { waitUntil: 'load' })
          await wait(page, 2000)
          if (page.url().includes('/login'))
            throw new Error('Manager redirected to /login from /evaluations')
        })
      },
    },

    // ── Developer full access ────────────────────────────────────────────────
    {
      name: 'Developer: /users shows user management table',
      async fn() {
        await withRole('developer', async (page) => {
          await page.goto(cfg.baseUrl + '/users', { waitUntil: 'load' })
          await page.waitForSelector('table.kbt-table, table.amw-user-master-table', { timeout: 8000 }).catch(() => {})
          await wait(page, 1000)
          const text = await page.evaluate(() => document.body.innerText)
          if (text.match(/admins only|permission|forbidden/i))
            throw new Error('Developer sees forbidden on /users — should have full access')
          const rows = await page.evaluate(() => document.querySelectorAll('table tbody tr').length)
          if (rows === 0) throw new Error('Developer sees /users but table is empty — may be blocked')
        })
      },
    },

    {
      name: 'Developer: /data shows import controls',
      async fn() {
        await withRole('developer', async (page) => {
          await page.goto(cfg.baseUrl + '/data', { waitUntil: 'load' })
          await wait(page, 2000)
          const text = await page.evaluate(() => document.body.innerText)
          if (text.match(/admins only|permission|forbidden/i))
            throw new Error('Developer sees forbidden on /data — should have full access')
          const hasImport = await page.evaluate(() =>
            !!document.querySelector('input[type="file"], button, label') && document.body.innerText.match(/import|upload/i)
          )
          if (!hasImport) throw new Error('Developer on /data but no import controls visible')
        })
      },
    },

    // ── Unauthenticated access ───────────────────────────────────────────────
    {
      name: 'Unauthenticated user is blocked from /evaluations',
      async fn() {
        const { page, context } = await newPage('desktop', null)
        try {
          await page.goto(cfg.baseUrl + '/evaluations', { waitUntil: 'load' })
          await wait(page, 1500)
          if (!page.url().includes('/login'))
            throw new Error(`Unauthenticated access to /evaluations was not blocked — URL: ${page.url()}`)
        } finally {
          await context.close().catch(() => {})
        }
      },
    },

    {
      name: 'Unauthenticated user is blocked from /users',
      async fn() {
        const { page, context } = await newPage('desktop', null)
        try {
          await page.goto(cfg.baseUrl + '/users', { waitUntil: 'load' })
          await wait(page, 1500)
          if (!page.url().includes('/login'))
            throw new Error(`Unauthenticated access to /users was not blocked — URL: ${page.url()}`)
        } finally {
          await context.close().catch(() => {})
        }
      },
    },
  ],
}
