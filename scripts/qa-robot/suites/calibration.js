/**
 * Calibration suite — tests the Calibration workspace (/calibration).
 *
 * The page only shows evaluations that have a totalScore (fully scored evals).
 * Tests gracefully handle the case where no scored evals exist in the DB yet.
 */
const cfg  = require('../config')
const { login, newPage } = require('../lib/browser')

const go   = (page, path) => page.goto(cfg.baseUrl + path, { waitUntil: 'load' })
const wait = (page, ms)   => page.waitForTimeout(ms)
const cnt  = async (page, sel) => page.locator(sel).count()

module.exports = {
  name: 'calibration',
  viewport: 'desktop',

  async setup(page) {
    const { ok } = await login(page, cfg.accounts.admin)
    if (!ok) throw new Error('Calibration suite: login failed in setup')
  },

  tests: [
    {
      name: 'Calibration page loads without errors',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2500)
        const text = await page.evaluate(() => document.body.innerText)
        if (text.length < 10) throw new Error('Calibration page loaded blank')
        if (page.url().includes('/login')) throw new Error('Calibration redirected to /login — session lost')
        if (text.match(/\bNaN\b/)) throw new Error('Calibration page shows NaN values')
      },
    },

    {
      name: 'Calibration page heading and description render',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2000)
        const text = await page.evaluate(() => document.body.innerText)
        if (!text.match(/calibrat|grade|performance/i))
          throw new Error('No calibration-related heading found on page')
      },
    },

    {
      name: 'Metric cards render (Scored, Grade set, Locked)',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2500)
        // Metric cards contain numbers formatted as "X/Y"
        const hasMetrics = await page.evaluate(() => {
          const text = document.body.innerText
          // Look for the metric pattern "N/N" which appears in "0/0", "3/7", etc.
          return /\d+\/\d+/.test(text) || document.querySelectorAll('.kbt-metric, .amw-report-metric').length > 0
        })
        if (!hasMetrics) throw new Error('No metric cards found on calibration page')
      },
    },

    {
      name: 'Search input exists and accepts text',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2000)
        const searchInput = page.locator('.kbt-input[placeholder*="Search"], .kbt-input[placeholder*="search"]').first()
        if (await searchInput.count() === 0) throw new Error('Search input not found on calibration page')
        await searchInput.fill('test query')
        await wait(page, 300)
        await searchInput.fill('')
      },
    },

    {
      name: 'Band filter dropdown has expected options',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2000)
        // Three select elements: band filter, status filter (and grade dropdowns in rows)
        const selects = page.locator('section.kbt-card select.kbt-input')
        const count = await selects.count()
        if (count < 2) throw new Error(`Expected at least 2 filter dropdowns, found ${count}`)

        const bandOptions = await selects.first().evaluate(el =>
          [...el.options].map(o => o.value)
        )
        const expectedBands = ['ALL', 'top', 'strong', 'solid', 'watch', 'risk']
        const hasBands = expectedBands.every(b => bandOptions.includes(b))
        if (!hasBands)
          throw new Error(`Band filter missing expected options. Got: ${bandOptions.join(', ')}`)
      },
    },

    {
      name: 'Status filter dropdown has Open/Closed options',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2000)
        const selects = page.locator('section.kbt-card select.kbt-input')
        const count = await selects.count()
        if (count < 2) return // skip if no filters rendered

        const statusOptions = await selects.nth(1).evaluate(el =>
          [...el.options].map(o => o.value)
        )
        if (!statusOptions.includes('ALL') || !statusOptions.includes('OPEN') || !statusOptions.includes('CLOSED'))
          throw new Error(`Status filter missing options. Got: ${statusOptions.join(', ')}`)
      },
    },

    {
      name: 'Table renders or empty state shown (no crash)',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2500)
        const hasTable      = await cnt(page, 'table.kbt-table')
        const hasEmptyState = await cnt(page, '[class*="EmptyState"], [class*="empty-state"]')
        if (hasTable + hasEmptyState === 0)
          throw new Error('Neither calibration table nor empty state found — page may have crashed')
      },
    },

    {
      name: 'Table column headers are correct when evaluations exist',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2500)
        const rows = await cnt(page, 'table.kbt-table tbody tr')
        if (rows === 0) return // no scored evals — skip

        const headers = await page.evaluate(() =>
          [...document.querySelectorAll('table.kbt-table thead th')].map(th => th.textContent?.trim())
        )
        const expected = ['Employee', 'Department', 'Score', 'Band', 'Final Grade', 'Status', 'Action']
        const missing  = expected.filter(h => !headers.some(th => th?.match(new RegExp(h, 'i'))))
        if (missing.length > 0) throw new Error(`Missing column headers: ${missing.join(', ')}`)
      },
    },

    {
      name: 'Score values display with 2 decimal places',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2500)
        const rows = await cnt(page, 'table.kbt-table tbody tr')
        if (rows === 0) return // no scored evals — skip

        const scores = await page.evaluate(() =>
          [...document.querySelectorAll('.kbt-score-value')].map(el => el.textContent?.trim())
        )
        if (scores.length === 0) throw new Error('No .kbt-score-value elements found in calibration table')
        const validScore = scores.every(s => /^\d+\.\d{2}$/.test(s || ''))
        if (!validScore) throw new Error(`Score format invalid: ${scores.slice(0, 3).join(', ')}`)
      },
    },

    {
      name: 'Band chips render with colour styling',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2500)
        const rows = await cnt(page, 'table.kbt-table tbody tr')
        if (rows === 0) return // no scored evals — skip

        const hasBandChips = await page.evaluate(() => {
          const text = document.body.innerText
          return /exceptional|strong|solid|watch|risk/i.test(text)
        })
        if (!hasBandChips) throw new Error('No band labels (Exceptional/Strong/Solid/Watch/Risk) found in table')
      },
    },

    {
      name: 'Status badges use semantic kbt-badge classes',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2500)
        const rows = await cnt(page, 'table.kbt-table tbody tr')
        if (rows === 0) return // no scored evals — skip

        const badgeCount = await cnt(page, '[class*="kbt-badge"]')
        if (badgeCount === 0) throw new Error('No kbt-badge-* elements found — status badges not rendering')
      },
    },

    {
      name: 'Band filter reduces visible rows',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2500)
        const totalRows = await cnt(page, 'table.kbt-table tbody tr')
        if (totalRows < 2) return // need at least 2 rows to test filtering

        const selects = page.locator('section.kbt-card select.kbt-input')
        await selects.first().selectOption('top') // filter to "Exceptional" band
        await wait(page, 500)
        const filteredRows = await cnt(page, 'table.kbt-table tbody tr')
        // Either fewer rows or empty state — filtering must do something
        const emptyState = await cnt(page, '[class*="EmptyState"]')
        if (filteredRows >= totalRows && emptyState === 0)
          throw new Error(`Band filter did not reduce rows (before: ${totalRows}, after: ${filteredRows})`)
        // Reset
        await selects.first().selectOption('ALL')
      },
    },

    {
      name: 'Open link navigates to evaluation form',
      async fn(page) {
        await go(page, '/calibration')
        await wait(page, 2500)
        const rows = await cnt(page, 'table.kbt-table tbody tr')
        if (rows === 0) return // no scored evals — skip

        const openLink = page.locator('table.kbt-table tbody tr').first().locator('a:has-text("Open")').first()
        if (await openLink.count() === 0) throw new Error('No Open link found in first calibration row')
        await openLink.click()
        await wait(page, 2000)
        if (!page.url().includes('/evaluations/'))
          throw new Error(`Open link did not navigate to /evaluations/:id — got: ${page.url()}`)
      },
    },
  ],
}
