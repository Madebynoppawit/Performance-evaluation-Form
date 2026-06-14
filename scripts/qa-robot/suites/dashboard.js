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
  ],
}
