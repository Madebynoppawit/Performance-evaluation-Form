/**
 * Tablet suite — tests key pages at 768×1024 viewport.
 *
 * At 768px the app uses a collapsed sidebar (same as mobile) or a persistent
 * sidebar depending on the CSS breakpoint. We verify content renders correctly
 * and there are no layout breakages at this viewport.
 */
const cfg  = require('../config')
const { login } = require('../lib/browser')

const go   = (page, path) => page.goto(cfg.baseUrl + path, { waitUntil: 'load' })
const wait = (page, ms)   => page.waitForTimeout(ms)
const cnt  = async (page, sel) => page.locator(sel).count()

module.exports = {
  name: 'tablet',
  viewport: 'tablet',

  async setup(page) {
    const { ok } = await login(page, cfg.accounts.admin)
    if (!ok) throw new Error('Tablet suite: login failed in setup')
  },

  tests: [
    {
      name: 'Dashboard loads correctly on tablet (768px)',
      async fn(page) {
        await go(page, '/')
        await wait(page, 2000)
        const text = await page.evaluate(() => document.body.innerText.trim())
        if (text.length < 10) throw new Error('Dashboard loaded blank on tablet')
        if (!text.match(/good morning|good afternoon|good evening|administrator|dashboard/i))
          throw new Error('Dashboard greeting not found on tablet viewport')
      },
    },

    {
      name: 'No horizontal scroll on dashboard at 768px',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1500)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        if (overflow) throw new Error('Dashboard has horizontal overflow at 768px tablet — layout broken')
      },
    },

    {
      name: 'Main content renders at usable width on tablet',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1500)
        const width = await page.evaluate(() => {
          const el = document.querySelector('.amw-workspace-frame, main, #app-main, [class*="content"]')
          return el ? el.getBoundingClientRect().width : 0
        })
        if (width < 500) throw new Error(`Content area is only ${width}px wide on tablet — may be hidden or constrained`)
      },
    },

    {
      name: 'Evaluations list usable on tablet',
      async fn(page) {
        await go(page, '/evaluations')
        await wait(page, 2000)
        const text = await page.evaluate(() => document.body.innerText)
        if (!text.match(/evaluation/i)) throw new Error('Evaluations page blank on tablet')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        if (overflow) throw new Error('Evaluations list has horizontal overflow at 768px')
      },
    },

    {
      name: 'Reports page renders on tablet without overflow',
      async fn(page) {
        await go(page, '/reports')
        await wait(page, 2500)
        const text = await page.evaluate(() => document.body.innerText.trim())
        if (text.length < 10) throw new Error('Reports page blank on tablet')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        if (overflow) throw new Error('Reports page has horizontal overflow at 768px')
      },
    },

    {
      name: 'User Management table readable on tablet',
      async fn(page) {
        await go(page, '/users')
        await page.waitForSelector('table.kbt-table', { timeout: 8000 }).catch(() => {})
        await wait(page, 1000)
        const text = await page.evaluate(() => document.body.innerText)
        if (!text.match(/user/i)) throw new Error('User Management page blank on tablet')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        if (overflow) throw new Error('User Management table has horizontal overflow at 768px — consider responsive table')
      },
    },

    {
      name: 'Navigation links are reachable on tablet',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1500)
        // On tablet, sidebar may be collapsed behind hamburger or fully visible
        // Either way, navigation must be reachable (sidebar visible OR hamburger present)
        const sidebarVisible = await page.evaluate(() => {
          const sb = document.querySelector('.kbt-sidebar')
          if (!sb) return false
          const rect = sb.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        })
        const hamburgerVisible = await cnt(page, '.amw-hamburger:visible, .amw-hamburger')

        if (!sidebarVisible && hamburgerVisible === 0)
          throw new Error('Neither sidebar nor hamburger visible on tablet — navigation not accessible')
      },
    },

    {
      name: 'Ctrl+K command palette opens on tablet',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1200)
        await page.keyboard.press('Control+k')
        await wait(page, 700)
        const dialog = await cnt(page, '[role="dialog"], [class*="cmdk"]')
        if (dialog === 0) throw new Error('Command palette did not open with Ctrl+K on tablet')
        await page.keyboard.press('Escape')
      },
    },
  ],
}
