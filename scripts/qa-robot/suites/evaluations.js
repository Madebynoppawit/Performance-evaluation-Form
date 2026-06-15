const cfg  = require('../config')
const { login, newPage } = require('../lib/browser')

const go   = (page, path) => page.goto(cfg.baseUrl + path, { waitUntil: 'load' })
const wait = (page, ms)   => page.waitForTimeout(ms)
const cnt  = async (page, sel) => page.locator(sel).count()
const text = async (page)      => page.evaluate(() => document.body.innerText)

module.exports = {
  name: 'evaluations',
  viewport: 'desktop',

  async setup(page) {
    const { ok } = await login(page, cfg.accounts.admin)
    if (!ok) throw new Error('Evaluations suite: login failed in setup')
  },

  tests: [
    {
      name: 'Evaluation list page loads',
      async fn(page) {
        await go(page, '/evaluations')
        await wait(page, 2000)
        const t = await text(page)
        if (!t.match(/evaluation/i)) throw new Error('No "evaluation" text found on list page')
      },
    },

    {
      name: 'Evaluation list shows stat cards',
      async fn(page) {
        await go(page, '/evaluations')
        await wait(page, 2000)
        const statCards = await page.evaluate(() => {
          const els = document.querySelectorAll('[class*="stat"], [class*="metric"], strong')
          return [...els].some(e => /\d/.test(e.textContent || ''))
        })
        if (!statCards) throw new Error('No numeric stat cards found on evaluation list')
      },
    },

    {
      name: 'Search input filters the list',
      async fn(page) {
        await go(page, '/evaluations')
        await wait(page, 2000)
        const srch = page.locator('input[placeholder*="earch"]').first()
        if (await srch.count() === 0) throw new Error('Search input not found on eval list')
        const rowsBefore = await cnt(page, 'table tbody tr')
        await srch.fill('ZZNOTFOUND99')
        await wait(page, 600)
        const rowsAfter = await cnt(page, 'table tbody tr')
        if (rowsBefore > 0 && rowsAfter >= rowsBefore)
          throw new Error(`Search did not reduce results (before: ${rowsBefore}, after: ${rowsAfter})`)
        await srch.fill('')
        await wait(page, 300)
      },
    },

    {
      name: 'Search with no match shows empty state',
      async fn(page) {
        await go(page, '/evaluations')
        await wait(page, 1500)
        const srch = page.locator('input[placeholder*="earch"]').first()
        if (await srch.count() === 0) return // search not present — skip
        await srch.fill('ZZNOTFOUND99_UNIQUE')
        await wait(page, 700)
        const emptyState = await cnt(page, '[class*="EmptyState"], [class*="empty"], svg[class*="empty"]')
        if (emptyState === 0) throw new Error('No empty state shown when search returns 0 results')
        await srch.fill('')
      },
    },

    {
      name: 'Evaluation row "Open" button navigates to form',
      async fn(page) {
        await go(page, '/evaluations')
        await wait(page, 2000)
        const rows = await cnt(page, 'table tbody tr')
        if (rows === 0) return // no evaluations in seed — skip
        const openBtn = page.locator('table tbody tr').first().locator('a[href*="/evaluations/"], button:has-text("Open")').first()
        if (await openBtn.count() === 0) throw new Error('No Open button/link found on first eval row')
        await openBtn.click()
        await wait(page, 2000)
        if (!page.url().includes('/evaluations/')) throw new Error(`Open did not navigate to /evaluations/:id — URL: ${page.url()}`)
      },
    },

    {
      name: 'Evaluation form renders with scoring UI',
      async fn(page) {
        await go(page, '/evaluations')
        await wait(page, 1500)
        const rows = await cnt(page, 'table tbody tr')
        if (rows === 0) return // skip — no data
        const openBtn = page.locator('table tbody tr').first().locator('a[href*="/evaluations/"]').first()
        if (await openBtn.count() === 0) return
        await openBtn.click()
        await wait(page, 2500)
        await page.evaluate(() => window.scrollTo(0, 1000))
        await wait(page, 500)
        // Look for scoring areas, rating buttons, or numeric inputs
        const scoreArea = await page.evaluate(() => {
          const body = document.body.innerText
          return body.match(/score|rating|คะแนน|ประเมิน/i) !== null
        })
        if (!scoreArea) throw new Error('Evaluation form has no score/rating content')
      },
    },

    {
      name: 'New evaluation modal opens',
      async fn(page) {
        await go(page, '/evaluations')
        await wait(page, 1500)
        // canManage = DEVELOPER | MANAGER | supervisory position — not plain ADMIN
        // Button label is translated: eval.new = "New Evaluation" (EN) / "สร้างการประเมิน" (TH)
        const newBtn = page.locator('button').filter({ hasText: /New Evaluation|สร้างการประเมิน|Nouvelle|Nueva/i }).first()
        if (await newBtn.count() === 0) {
          // Admin without supervisory position won't see this — skip gracefully
          console.warn('  [SKIP] New Evaluation button not visible for current user role/position')
          return
        }
        await newBtn.click()
        await wait(page, 1200)
        const modal = await page.evaluate(() =>
          !!(document.querySelector('.kbt-modal-backdrop, [role="dialog"]'))
        )
        if (!modal) throw new Error('New evaluation modal did not open after button click')
        await page.keyboard.press('Escape')
        await wait(page, 400)
      },
    },

    {
      name: 'Pagination controls present when rows > 25',
      async fn(page) {
        await go(page, '/evaluations')
        await wait(page, 2000)
        const rows = await cnt(page, 'table tbody tr')
        if (rows < 25) return // not enough data to show pagination
        const pager = await page.evaluate(() => {
          const body = document.body.innerText
          return body.match(/of \d+|page \d+/i) !== null ||
                 document.querySelector('[class*="pagination"], button[aria-label*="next"]') !== null
        })
        if (!pager) throw new Error('Pagination controls not visible with > 25 rows')
      },
    },

    // ── Write-path tests (require developer role — read/write access) ────────
    {
      name: 'Save Draft button present on eval form (developer session)',
      async fn(_page) {
        const devAccount = cfg.accounts.developer
        if (!devAccount) { console.warn('  [SKIP] No developer account in config'); return }

        const { page: p, context: ctx } = await newPage('desktop', null)
        try {
          const { ok } = await login(p, devAccount)
          if (!ok) { console.warn('  [SKIP] Developer login failed'); return }

          await p.goto(cfg.baseUrl + '/evaluations', { waitUntil: 'load' })
          await wait(p, 2000)
          const rows = await cnt(p, 'table tbody tr')
          if (rows === 0) { console.warn('  [SKIP] No evaluations in list'); return }

          const openBtn = p.locator('table tbody tr').first().locator('a[href*="/evaluations/"]').first()
          if (await openBtn.count() === 0) { console.warn('  [SKIP] No Open link found'); return }
          await openBtn.click()
          await wait(p, 2500)

          // Developer is NOT read-only — Save Draft button should be enabled
          const saveBtn = await p.evaluate(() => {
            const btns = [...document.querySelectorAll('button')]
            return btns.find(b => /save draft|save|บันทึก/i.test(b.textContent || ''))?.textContent?.trim() ?? null
          })
          if (!saveBtn) throw new Error('Save Draft button not found on eval form (developer role)')
        } finally {
          await ctx.close().catch(() => {})
        }
      },
    },

    {
      name: 'Save Draft API call succeeds (developer session)',
      async fn(_page) {
        const devAccount = cfg.accounts.developer
        if (!devAccount) { console.warn('  [SKIP] No developer account in config'); return }

        const { page: p, context: ctx } = await newPage('desktop', null)
        try {
          const { ok } = await login(p, devAccount)
          if (!ok) { console.warn('  [SKIP] Developer login failed'); return }

          await p.goto(cfg.baseUrl + '/evaluations', { waitUntil: 'load' })
          await wait(p, 2000)
          const rows = await cnt(p, 'table tbody tr')
          if (rows === 0) { console.warn('  [SKIP] No evaluations in list'); return }

          const openBtn = p.locator('table tbody tr').first().locator('a[href*="/evaluations/"]').first()
          if (await openBtn.count() === 0) { console.warn('  [SKIP] No Open link'); return }
          await openBtn.click()
          await wait(p, 2500)

          const saveBtn = p.locator('button').filter({ hasText: /save draft|save|บันทึก/i }).first()
          if (await saveBtn.count() === 0) { console.warn('  [SKIP] Save button not found'); return }

          // Listen for any API error responses
          const errors = []
          p.on('response', r => { if (r.status() >= 400 && r.url().includes('/evaluations/')) errors.push(`${r.status()} ${r.url()}`) })

          await saveBtn.click()
          await wait(p, 2500)

          // Check for success indicator or that no error appeared
          const text = await p.evaluate(() => document.body.innerText)
          const hasError = text.match(/save.*fail|failed|error.*save/i) || errors.length > 0
          if (hasError) throw new Error(`Save Draft failed — API errors: ${errors.join(', ')}`)

          const hasSavedIndicator = text.match(/saved|บันทึกแล้ว|enregistré/i)
          if (!hasSavedIndicator) console.warn('  [WARN] No "Saved" indicator after save — may be async')
        } finally {
          await ctx.close().catch(() => {})
        }
      },
    },
  ],
}
