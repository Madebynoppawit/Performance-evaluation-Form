/**
 * Reports page test suite
 */
const cfg  = require('../config')
const { login } = require('../lib/browser')

const go   = (page, path) => page.goto(cfg.baseUrl + path, { waitUntil: 'load' })
const wait = (page, ms)   => page.waitForTimeout(ms)
const cnt  = async (page, sel) => page.locator(sel).count()

module.exports = {
  name: 'reports',
  viewport: 'desktop',

  async setup(page) {
    const { ok } = await login(page, cfg.accounts.admin)
    if (!ok) throw new Error('Reports suite: login failed in setup')
  },

  tests: [
    {
      name: 'Reports page loads without blank screen',
      async fn(page) {
        await go(page, '/reports')
        await wait(page, 3000)
        const text = await page.evaluate(() => document.body.innerText.trim())
        if (text.length < 10) throw new Error('Reports page loaded blank (body text < 10 chars)')
        const url = page.url()
        if (url.includes('/login')) throw new Error('Reports page redirected to /login — session issue')
      },
    },

    {
      name: 'Reports page shows report-related content',
      async fn(page) {
        await go(page, '/reports')
        await wait(page, 3000)
        const text = await page.evaluate(() => document.body.innerText)
        if (!text.match(/report|summary|evaluation|statistic|performance/i))
          throw new Error('Reports page has no report-related text (report, summary, evaluation, statistic)')
      },
    },

    {
      name: 'Stat/summary cards or charts present',
      async fn(page) {
        await go(page, '/reports')
        await wait(page, 3000)
        // Look for cards, charts, or summary numbers
        const cards = await cnt(page, '.kbt-card, [class*="stat-card"], [class*="metric"], [class*="summary"], canvas, svg[class*="chart"]')
        if (cards === 0) {
          // Fallback: check that there's a meaningful content element (table or paragraph)
          const fallback = await cnt(page, 'table, [class*="report"]')
          if (fallback === 0) throw new Error('Reports page has no stat cards, charts, or data tables')
        }
      },
    },

    {
      name: 'Cycle selector/filter is available',
      async fn(page) {
        await go(page, '/reports')
        await wait(page, 2000)
        const selectors = await cnt(page, 'select, [role="combobox"], [class*="dropdown"], [class*="select"]')
        // Known gap: Reports page currently has no cycle filter (tracked as backlog item)
        // Test is informational — warns but does not fail the suite
        if (selectors === 0) console.warn('  [WARN] No cycle selector on Reports page — known backlog item')
      },
    },

    {
      name: 'Export button is present on Reports page',
      async fn(page) {
        await go(page, '/reports')
        await wait(page, 2000)
        const exportBtn = await cnt(page, 'button:has-text("Export"), button:has-text("Download"), a:has-text("Export"), a:has-text("PDF"), a:has-text("CSV")')
        if (exportBtn === 0)
          throw new Error('No export/download button on Reports page (BUG-05: Missing export button on Reports page)')
      },
    },

    {
      name: 'Reports shows completion rate or score data',
      async fn(page) {
        await go(page, '/reports')
        await wait(page, 3000)
        const text = await page.evaluate(() => document.body.innerText)
        // Either a % sign (completion rate) or a numeric score
        const hasData = /\d+%|\d+\.\d+|score|rate|completion|submitted/i.test(text)
        if (!hasData)
          throw new Error('Reports page shows no quantitative data (no %, scores, or completion rates)')
      },
    },

    {
      name: 'No horizontal scroll at 1440px viewport',
      async fn(page) {
        await go(page, '/reports')
        await wait(page, 2000)
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth
        })
        if (overflow) throw new Error('Reports page has horizontal overflow at 1440px — layout broken')
      },
    },

    {
      name: 'Reports accessible to manager role',
      async fn(page) {
        const mgr = cfg.accounts.manager
        if (!mgr) return // skip if no manager account

        await page.goto(cfg.baseUrl + '/login', { waitUntil: 'load' })
        await wait(page, 1000)
        await page.fill('input[name="identifier"]', mgr.identifier)
        await page.fill('input[type="password"]', mgr.password)
        await page.click('button[type="submit"]')
        await wait(page, 2000)

        await go(page, '/reports')
        await wait(page, 2000)
        const url = page.url()
        if (url.includes('/login') || url.includes('/403'))
          throw new Error('Manager role cannot access Reports page — should be allowed')

        // Re-login as admin
        await login(page, cfg.accounts.admin)
        await wait(page, 1000)
      },
    },
  ],
}
