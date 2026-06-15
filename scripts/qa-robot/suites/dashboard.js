const cfg  = require('../config')
const { login } = require('../lib/browser')

const go   = (page, path) => page.goto(cfg.baseUrl + path, { waitUntil: 'load' })
const wait = (page, ms)   => page.waitForTimeout(ms)
const cnt  = async (page, sel) => page.locator(sel).count()

module.exports = {
  name: 'dashboard',
  viewport: 'desktop',

  async setup(page) {
    const { ok } = await login(page, cfg.accounts.admin)
    if (!ok) throw new Error('Dashboard suite: login failed in setup')
  },

  tests: [
    {
      name: 'Dashboard loads without errors',
      async fn(page) {
        await go(page, '/')
        await wait(page, 2000)
        const bodyText = await page.evaluate(() => document.body.innerText)
        if (bodyText.match(/\bNaN\b|undefined/)) throw new Error('Dashboard shows NaN or undefined values')
        if (!bodyText.match(/dashboard|good morning|good afternoon|good evening/i))
          throw new Error('Dashboard greeting not found in page text')
      },
    },

    {
      name: 'Metric cards render with numeric values',
      async fn(page) {
        await go(page, '/')
        await wait(page, 2500)
        const nums = await page.evaluate(() => {
          const els = document.querySelectorAll('.kbt-metric-card strong, [class*="metric"] strong')
          return [...els].map(e => e.textContent?.trim()).filter(Boolean)
        })
        if (nums.length === 0) throw new Error('No metric card values found — cards may not be rendering')
      },
    },

    {
      name: 'Executive insights strip renders',
      async fn(page) {
        await go(page, '/')
        await wait(page, 2000)
        const strip = await cnt(page, '.amw-exec-strip, .amw-exec-insight')
        if (strip === 0) throw new Error('Executive strip (.amw-exec-strip) not found on dashboard')
      },
    },

    {
      name: 'Recent evaluations table renders',
      async fn(page) {
        await go(page, '/')
        await wait(page, 2500)
        await page.evaluate(() => window.scrollTo(0, 2000))
        await wait(page, 600)
        // Either a table or empty-state should be present
        const hasTable  = await cnt(page, 'table.kbt-table')
        const hasEmpty  = await cnt(page, '[class*="EmptyState"], [class*="empty-state"]')
        if (hasTable + hasEmpty === 0)
          throw new Error('Neither table nor empty-state found in dashboard recent evaluations section')
      },
    },

    {
      name: 'CorporateBar renders with breadcrumb',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1500)
        const bar = await cnt(page, '.amw-corp-bar')
        if (bar === 0) throw new Error('.amw-corp-bar not found on dashboard')
        const breadcrumb = await cnt(page, '.amw-corp-breadcrumb')
        if (breadcrumb === 0) throw new Error('.amw-corp-breadcrumb not found')
      },
    },

    {
      name: 'Health API returns ok status',
      async fn(page) {
        const res = await page.evaluate(async (url) => {
          const r = await fetch(url)
          return { status: r.status, body: await r.json() }
        }, cfg.apiUrl + '/health')
        if (res.status !== 200) throw new Error(`Health endpoint returned HTTP ${res.status}`)
        if (res.body.status !== 'ok') throw new Error(`Health status is "${res.body.status}", expected "ok"`)
      },
    },

    {
      name: 'Command palette opens with Ctrl+K',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1200)
        await page.keyboard.press('Control+k')
        await wait(page, 700)
        const dialog = await cnt(page, '[role="dialog"], [class*="cmdk"]')
        if (dialog === 0) throw new Error('Command palette dialog not found after Ctrl+K')
        await page.keyboard.press('Escape')
      },
    },

    {
      name: 'Notification bell opens panel',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1200)
        const bell = page.locator('button[aria-label*="otif"]').first()
        if (await bell.count() === 0) throw new Error('Bell button (aria-label*=otif) not found')
        await bell.click()
        await wait(page, 500)
        const panel = await cnt(page, '.amw-notification-popover, [class*="notification-popover"]')
        if (panel === 0) throw new Error('Notification panel did not open after clicking bell')
        await page.keyboard.press('Escape')
      },
    },

    // ── Command Palette — interaction tests ──────────────────────────────────
    {
      name: 'Command palette filters results when typing',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1200)
        await page.keyboard.press('Control+k')
        await wait(page, 700)
        const dialog = page.locator('[role="dialog"], [class*="cmdk"]').first()
        if (await dialog.count() === 0) throw new Error('Command palette did not open')

        // Type a keyword that should match at least one command
        const input = dialog.locator('input').first()
        if (await input.count() === 0) throw new Error('No search input inside command palette')
        await input.fill('report')
        await wait(page, 500)

        // Results should be filtered — look for "Reports" in the visible results
        const text = await dialog.evaluate(el => el.innerText)
        if (!text.match(/report/i))
          throw new Error('Command palette does not show "Reports" when typing "report"')

        await page.keyboard.press('Escape')
      },
    },

    {
      name: 'Command palette navigates to page on Enter',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1200)
        await page.keyboard.press('Control+k')
        await wait(page, 700)
        const dialog = page.locator('[role="dialog"], [class*="cmdk"]').first()
        if (await dialog.count() === 0) throw new Error('Command palette did not open')

        const input = dialog.locator('input').first()
        if (await input.count() === 0) { await page.keyboard.press('Escape'); return }

        // Type "reports" and press Enter to navigate
        await input.fill('reports')
        await wait(page, 600)
        await page.keyboard.press('Enter')
        await wait(page, 1500)

        // Should have navigated away from dashboard
        const url = page.url()
        if (url === cfg.baseUrl + '/' || url === cfg.baseUrl)
          throw new Error('Command palette Enter did not navigate — still on dashboard')
      },
    },

    {
      name: 'Notification panel shows notification items or empty state',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1200)
        const bell = page.locator('button[aria-label*="otif"]').first()
        if (await bell.count() === 0) throw new Error('Bell button not found')
        await bell.click()
        await wait(page, 800)
        const panel = page.locator('.amw-notification-popover, [class*="notification-popover"]').first()
        if (await panel.count() === 0) throw new Error('Notification panel did not open')

        // Panel should contain either notification items or an empty state
        const text = await panel.evaluate(el => el.innerText)
        if (text.trim().length < 2)
          throw new Error('Notification panel is empty with no items or empty state text')

        await page.keyboard.press('Escape')
      },
    },
  ],
}
