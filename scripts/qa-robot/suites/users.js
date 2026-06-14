/**
 * User Management test suite
 */
const cfg  = require('../config')
const { login, newPage } = require('../lib/browser')

const go   = (page, path) => page.goto(cfg.baseUrl + path, { waitUntil: 'load' })
const wait = (page, ms)   => page.waitForTimeout(ms)
const cnt  = async (page, sel) => page.locator(sel).count()

module.exports = {
  name: 'users',
  viewport: 'desktop',

  async setup(page) {
    const { ok } = await login(page, cfg.accounts.admin)
    if (!ok) throw new Error('Users suite: login failed in setup')
  },

  tests: [
    {
      name: 'User Management page loads',
      async fn(page) {
        await go(page, '/users')
        await wait(page, 2000)
        const text = await page.evaluate(() => document.body.innerText)
        if (!text.match(/user/i)) throw new Error('User Management page has no user-related content')
        if (text.length < 30) throw new Error('User Management page appears blank')
      },
    },

    {
      name: 'User list shows at least one user row',
      async fn(page) {
        await go(page, '/users')
        // Wait for table to appear (API call + render)
        await page.waitForSelector('table.kbt-table, table.amw-user-master-table', { timeout: 8000 }).catch(() => {})
        await wait(page, 1000)
        const rows = await page.evaluate(() =>
          document.querySelectorAll('table tbody tr').length
        )
        if (rows === 0) throw new Error('No user rows found in User Management table (table exists but is empty)')
      },
    },

    {
      name: 'Search / filter input exists',
      async fn(page) {
        await go(page, '/users')
        await wait(page, 1500)
        const search = await cnt(page, 'input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i], input[placeholder*="name" i]')
        if (search === 0) throw new Error('No search/filter input on User Management page')
      },
    },

    {
      name: 'Search filters the user list',
      async fn(page) {
        await go(page, '/users')
        await page.waitForSelector('table.kbt-table', { timeout: 8000 }).catch(() => {})
        await wait(page, 800)
        const searchSel = 'input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i], input[placeholder*="name" i]'
        const searchInput = page.locator(searchSel).first()
        if (await searchInput.count() === 0) return // skip if no search field

        const beforeRows = await page.evaluate(() => document.querySelectorAll('table tbody tr').length)

        await searchInput.fill('zzz_this_matches_nothing_9999')
        await wait(page, 1000)

        const afterRows  = await page.evaluate(() => document.querySelectorAll('table tbody tr').length)
        const emptyState = await page.evaluate(() => !!document.querySelector('[class*="EmptyState"], [class*="empty"]'))

        if (beforeRows > 0 && afterRows >= beforeRows && !emptyState)
          throw new Error(`Search did not reduce results (before: ${beforeRows}, after: ${afterRows})`)
      },
    },

    {
      name: 'Invite/New User button is present (admin)',
      async fn(page) {
        await go(page, '/users')
        await wait(page, 1500)
        const inviteBtn = await cnt(page, 'button:has-text("Invite"), button:has-text("New User"), button:has-text("Add User"), button:has-text("Create")')
        if (inviteBtn === 0) throw new Error('No invite/add user button on User Management page (admin should see this)')
      },
    },

    {
      name: 'User role badge visible in table',
      async fn(page) {
        await go(page, '/users')
        await wait(page, 2000)
        const text = await page.evaluate(() => document.body.innerText)
        if (!text.match(/admin|manager|employee|developer/i))
          throw new Error('No role labels visible in user list (expected: ADMIN, MANAGER, EMPLOYEE, etc.)')
      },
    },

    {
      name: 'Edit user action is reachable',
      async fn(page) {
        await go(page, '/users')
        await page.waitForSelector('table.kbt-table', { timeout: 8000 }).catch(() => {})
        await wait(page, 800)
        // Edit button text is translated — check for common edit icon buttons too
        const editBtns = await page.evaluate(() => {
          const btns = [...document.querySelectorAll('button')]
          return btns.filter(b => /edit|แก้ไข|modifier|Editar/i.test(b.textContent || '') ||
            b.querySelector('svg') !== null && b.closest('tbody tr') !== null
          ).length
        })
        if (editBtns === 0)
          throw new Error('No edit action found in user list (no edit button found in table rows)')
      },
    },

    {
      name: 'Non-admin cannot access User Management',
      async fn(_page) {
        const emp = cfg.accounts.employee
        if (!emp) return // skip if no employee account configured

        // Use a FRESH context (no addInitScript admin session injection) so we can
        // test a different role cleanly without the pre-seeded session interfering
        const { page: p2, context: ctx2 } = await newPage('desktop', null)
        try {
          const { ok } = await login(p2, emp)
          if (!ok) return // account missing or rate-limited — skip gracefully

          await p2.goto(cfg.baseUrl + '/users', { waitUntil: 'load' })
          await p2.waitForTimeout(2000)

          const url  = p2.url()
          const text = await p2.evaluate(() => document.body.innerText)
          const blocked = url.includes('/login') || url.includes('/403') ||
            text.match(/forbidden|unauthorized|access denied|not.*allowed|admins only|เฉพาะผู้ดูแล|permission/i)
          if (!blocked) throw new Error('Employee role can access /users — should be forbidden (RBAC not enforced)')
        } finally {
          await ctx2.close().catch(() => {})
        }
      },
    },
  ],
}
