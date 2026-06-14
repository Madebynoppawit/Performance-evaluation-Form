const cfg  = require('../config')
const { login } = require('../lib/browser')

const go   = (page, path) => page.goto(cfg.baseUrl + path, { waitUntil: 'load' })
const wait = (page, ms)   => page.waitForTimeout(ms)
const cnt  = async (page, sel) => page.locator(sel).count()

module.exports = {
  name: 'mobile',
  viewport: 'mobile',

  async setup(page) {
    const { ok } = await login(page, cfg.accounts.admin)
    if (!ok) throw new Error('Mobile suite: login failed in setup')
  },

  tests: [
    {
      name: 'Hamburger button visible on mobile',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1500)
        const ham = await cnt(page, '.amw-hamburger')
        if (ham === 0) throw new Error('.amw-hamburger button not found in mobile viewport')
        const visible = await page.locator('.amw-hamburger').first().isVisible()
        if (!visible) throw new Error('Hamburger button exists but is not visible on mobile')
      },
    },

    {
      name: 'Sidebar hidden by default on mobile',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1500)
        const sidebar = page.locator('.kbt-sidebar').first()
        // Sidebar should exist but be translated off-screen (not covering content)
        const isOpen = await sidebar.evaluate(el => el.classList.contains('is-open'))
        if (isOpen) throw new Error('Sidebar has is-open class by default on mobile — should start closed')
      },
    },

    {
      name: 'Hamburger opens sidebar drawer',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1500)
        await page.locator('.amw-hamburger').first().click()
        await wait(page, 500)
        const isOpen = await page.locator('.kbt-sidebar').first().evaluate(el => el.classList.contains('is-open'))
        if (!isOpen) throw new Error('Sidebar does not get is-open class after hamburger click')
        const backdrop = await cnt(page, '.kbt-sidebar-backdrop')
        if (backdrop === 0) throw new Error('Backdrop (.kbt-sidebar-backdrop) not shown when sidebar open')
      },
    },

    {
      name: 'Clicking backdrop closes sidebar',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1500)
        await page.locator('.amw-hamburger').first().click()
        await wait(page, 500)
        // Click at right side (outside 260px sidebar on 390px screen)
        await page.locator('.kbt-sidebar-backdrop').first().click({ position: { x: 340, y: 400 } })
        await wait(page, 400)
        const isOpen = await page.locator('.kbt-sidebar').first().evaluate(el => el.classList.contains('is-open'))
        if (isOpen) throw new Error('Sidebar still open after clicking backdrop')
      },
    },

    {
      name: 'Content renders full-width on mobile (sidebar not blocking)',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1500)
        // The main content area should take at least 320px width (most of the 390px viewport)
        const mainWidth = await page.evaluate(() => {
          const main = document.querySelector('.amw-workspace-frame, main, #app-main')
          if (!main) return 0
          return main.getBoundingClientRect().width
        })
        if (mainWidth < 300) throw new Error(`Main content area is only ${mainWidth}px wide on mobile — sidebar may be blocking`)
      },
    },

    {
      name: 'Corporate chips hidden on mobile (clean bar)',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1200)
        const chips = await page.evaluate(() => {
          const el = document.querySelector('.amw-corp-chips')
          if (!el) return 'not-found'
          return getComputedStyle(el).display
        })
        if (chips !== 'none' && chips !== 'not-found')
          throw new Error(`Corporate chips visible on mobile (display: ${chips}) — should be hidden`)
      },
    },

    {
      name: 'Dashboard readable on mobile viewport',
      async fn(page) {
        await go(page, '/')
        await wait(page, 2000)
        const text = await page.evaluate(() => document.body.innerText)
        if (!text.match(/good morning|good afternoon|good evening|administrator/i))
          throw new Error('Dashboard hero text not found on mobile — content may be hidden')
      },
    },

    {
      name: 'Evaluations list usable on mobile',
      async fn(page) {
        await go(page, '/evaluations')
        await wait(page, 2000)
        const text = await page.evaluate(() => document.body.innerText)
        if (!text.match(/evaluation/i)) throw new Error('Evaluations page blank on mobile')
      },
    },
  ],
}
