const cfg  = require('../config')
const { login } = require('../lib/browser')

const go   = (page, path) => page.goto(cfg.baseUrl + path, { waitUntil: 'load' })
const wait = (page, ms)   => page.waitForTimeout(ms)
const cnt  = async (page, sel) => page.locator(sel).count()

const ROUTES = [
  { path: '/',            label: 'Dashboard'       },
  { path: '/evaluations', label: 'Evaluations'     },
  { path: '/templates',   label: 'Templates'       },
  { path: '/cycles',      label: 'Cycles'          },
  { path: '/reports',     label: 'Reports'         },
  { path: '/calibrate',   label: 'Calibrate'       },
  { path: '/calibration', label: 'Calibration'     },
  { path: '/users',       label: 'User Management' },
  { path: '/data',        label: 'Data Management' },
  { path: '/account',     label: 'Account'         },
  { path: '/settings',    label: 'Settings'        },
  { path: '/guidelines',  label: 'Guidelines'      },
]

module.exports = {
  name: 'navigation',
  viewport: 'desktop',

  async setup(page) {
    const { ok } = await login(page, cfg.accounts.admin)
    if (!ok) throw new Error('Navigation suite: login failed in setup')
  },

  tests: [
    // All routes load without blank screen
    ...ROUTES.map(route => ({
      name: `Route ${route.path} loads (no blank page)`,
      async fn(page) {
        await go(page, route.path)
        await wait(page, 2000)
        const bodyText = await page.evaluate(() => document.body.innerText.trim())
        if (bodyText.length < 10)
          throw new Error(`${route.path} loaded a nearly blank page (body text < 10 chars)`)
        // Check page stayed on the route (no unexpected redirect)
        const url = page.url()
        if (url.includes('/login'))
          throw new Error(`${route.path} redirected to /login unexpectedly (session lost)`)
      },
    })),

    {
      name: '404 page shown for unknown route',
      async fn(page) {
        await go(page, '/this-route-absolutely-does-not-exist-qa-test')
        await wait(page, 1000)
        const bodyText = await page.evaluate(() => document.body.innerText)
        if (!bodyText.match(/404|not found/i))
          throw new Error('Unknown route does not show 404 page')
      },
    },

    {
      name: 'Sidebar nav links are all present',
      async fn(page) {
        await go(page, '/')
        await wait(page, 1200)
        const navLinks = await cnt(page, '.kbt-sidebar .kbt-nav-item, .kbt-sidebar a')
        if (navLinks < 6) throw new Error(`Expected ≥6 sidebar nav items, found ${navLinks}`)
      },
    },

    {
      name: 'SideNav active link highlights current page',
      async fn(page) {
        await go(page, '/evaluations')
        await wait(page, 1200)
        const activeLinks = await cnt(page, '.kbt-nav-item.active')
        if (activeLinks === 0) throw new Error('No active nav item found after navigating to /evaluations')
      },
    },

    {
      name: 'Back navigation works after page visit',
      async fn(page) {
        await go(page, '/')
        await wait(page, 800)
        await go(page, '/evaluations')
        await wait(page, 800)
        await page.goBack()
        await wait(page, 1000)
        const url = page.url()
        if (!url.match(/5173\/?$/)) throw new Error(`Back navigation failed — URL: ${url}`)
      },
    },

    {
      name: 'CorporateBar shows correct page name on each route',
      async fn(page) {
        const pairs = [
          { path: '/',            match: /workspace|dashboard/i },
          { path: '/evaluations', match: /evaluation/i          },
          { path: '/reports',     match: /report/i              },
        ]
        for (const { path, match } of pairs) {
          await go(page, path)
          await wait(page, 1000)
          const barText = await page.evaluate(() =>
            document.querySelector('.amw-corp-bar')?.innerText ?? ''
          )
          if (!match.test(barText))
            throw new Error(`CorporateBar on ${path} doesn't show expected label (got: "${barText.slice(0,60)}")`)
        }
      },
    },
  ],
}
