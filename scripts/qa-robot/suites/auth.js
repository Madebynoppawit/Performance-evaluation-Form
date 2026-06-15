const cfg = require('../config')
const { login } = require('../lib/browser')

/** Helpers */
const go   = (page, path)      => page.goto(cfg.baseUrl + path, { waitUntil: 'load' })
const wait = (page, ms)        => page.waitForTimeout(ms)
const text = async (page)      => page.evaluate(() => document.body.innerText)
const cnt  = async (page, sel) => page.locator(sel).count()

module.exports = {
  name: 'auth',
  viewport: 'desktop',

  async setup() {},

  tests: [
    {
      name: 'Login page renders correctly',
      async fn(page) {
        await go(page, '/login')
        await wait(page, 1200)
        const t = await text(page)
        if (!t.match(/sign in|amw command|enter command/i))
          throw new Error('Login page does not contain expected heading text')
        const input = await cnt(page, 'input[name="identifier"]')
        if (input === 0) throw new Error('identifier input not found on login page')
      },
    },

    {
      name: 'Empty form submit shows field-level errors',
      async fn(page) {
        await go(page, '/login')
        await wait(page, 1000)
        await page.click('button[type="submit"]')
        await wait(page, 700)
        // React Hook Form renders errors as <p style="color:#e52321">
        const errPs = await page.evaluate(() =>
          [...document.querySelectorAll('p')].some(p => p.style.color?.includes('e52321') || p.textContent?.match(/required|enter your|must/i))
        )
        if (!errPs) throw new Error('No inline validation errors shown after empty submit')
      },
    },

    {
      name: 'Wrong credentials shows error banner',
      async fn(page) {
        await go(page, '/login')
        await wait(page, 1000)
        await page.fill('input[name="identifier"]', 'nobody@notreal.com')
        await page.fill('input[type="password"]',   'WrongPass99!')
        await page.click('button[type="submit"]')
        await wait(page, 3000)
        const hasErr = await cnt(page, '.kbt-msg-error')
        if (hasErr === 0) throw new Error('No kbt-msg-error banner shown for wrong credentials')
      },
    },

    {
      name: 'Valid login redirects to dashboard',
      async fn(page) {
        // Detect rate-limiting (429) before attempting login
        const rateLimited = await page.evaluate(async (apiUrl) => {
          try {
            const r = await fetch(apiUrl + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: 'probe', password: 'probe' }) })
            return r.status === 429
          } catch { return false }
        }, cfg.apiUrl)
        if (rateLimited) { console.warn('  [SKIP] Auth rate limit active — skipping login test'); return }

        const { ok, error } = await login(page, cfg.accounts.admin)
        if (!ok) throw new Error(error)
        const url = page.url()
        if (!url.match(/localhost:\d+\/?$/)) throw new Error(`Expected dashboard URL, got: ${url}`)
      },
    },

    {
      name: 'Protected route redirects unauthenticated user to login',
      async fn(page) {
        // Must clear session first — previous tests may have left a valid session
        await page.context().clearCookies()
        await page.evaluate(() => { try { sessionStorage.clear(); localStorage.removeItem('amw-auth') } catch {} })
        await wait(page, 300)
        await go(page, '/evaluations')
        await wait(page, 1500)
        const url = page.url()
        if (!url.includes('/login')) throw new Error(`Protected route /evaluations did not redirect to /login, got: ${url}`)
      },
    },

    {
      name: 'Logout redirects to login page',
      async fn(page) {
        const rateLimited = await page.evaluate(async (apiUrl) => {
          try { const r = await fetch(apiUrl + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); return r.status === 429 } catch { return false }
        }, cfg.apiUrl)
        if (rateLimited) { console.warn('  [SKIP] Auth rate limit active — skipping logout test'); return }

        await login(page, cfg.accounts.admin)
        await wait(page, 1000)
        const headerBtns = await page.locator('.kbt-header button').all()
        if (!headerBtns.length) throw new Error('No buttons in header — cannot find user menu')
        await headerBtns[headerBtns.length - 1].click()
        await wait(page, 600)
        const signOut = page.locator('button:has-text("Sign out"), button:has-text("Logout")').first()
        if (await signOut.count() === 0) throw new Error('Sign out button not found in user menu')
        await signOut.click()
        await wait(page, 1500)
        if (!page.url().includes('/login')) throw new Error(`Logout did not navigate to /login, URL: ${page.url()}`)
      },
    },

    {
      name: 'Session is cleared after logout — protected route blocked',
      async fn(page) {
        const rateLimited = await page.evaluate(async (apiUrl) => {
          try { const r = await fetch(apiUrl + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); return r.status === 429 } catch { return false }
        }, cfg.apiUrl)
        if (rateLimited) { console.warn('  [SKIP] Auth rate limit active — skipping session test'); return }

        await login(page, cfg.accounts.admin)
        await wait(page, 800)
        const headerBtns = await page.locator('.kbt-header button').all()
        if (!headerBtns.length) throw new Error('Login did not create an authenticated session')
        await headerBtns[headerBtns.length - 1].click()
        await wait(page, 500)
        await page.locator('button:has-text("Sign out")').first().click()
        await wait(page, 1500)
        await go(page, '/evaluations')
        await wait(page, 1200)
        if (!page.url().includes('/login')) throw new Error('Protected route accessible after logout — session not cleared')
      },
    },

    {
      name: 'Forgot password link is present on login page',
      async fn(page) {
        await go(page, '/login')
        await wait(page, 800)
        const link = await cnt(page, 'a[href*="forgot"], button:has-text("Forgot")')
        if (link === 0) throw new Error('No "Forgot password" link on login page')
      },
    },

    // ── Forgot Password page ─────────────────────────────────────────────────
    {
      name: 'Forgot password page renders at /forgot-password',
      async fn(page) {
        await go(page, '/forgot-password')
        await wait(page, 1200)
        const text = await page.evaluate(() => document.body.innerText)
        if (text.length < 10) throw new Error('Forgot password page loaded blank')
        if (page.url().includes('/login')) throw new Error('/forgot-password redirected to /login — route not registered')
        if (!text.match(/forgot|reset|employee|password/i))
          throw new Error('Forgot password page has no relevant text')
      },
    },

    {
      name: 'Forgot password form has employeeNo and date inputs',
      async fn(page) {
        await go(page, '/forgot-password')
        await wait(page, 1000)
        const textInputs = await cnt(page, 'input[type="text"], input:not([type]), input[name="employeeNo"]')
        const dateInputs = await cnt(page, 'input[type="date"]')
        if (textInputs === 0) throw new Error('No text/employeeNo input on forgot-password page')
        if (dateInputs === 0) throw new Error('No date input (date of birth) on forgot-password page')
      },
    },

    {
      name: 'Forgot password: empty submit shows field-level validation',
      async fn(page) {
        await go(page, '/forgot-password')
        await wait(page, 1000)
        const submitBtn = page.locator('button[type="submit"]').first()
        if (await submitBtn.count() === 0) throw new Error('No submit button on forgot-password page')
        await submitBtn.click()
        await wait(page, 700)
        const hasErrors = await page.evaluate(() =>
          document.body.innerText.match(/required|enter your|must|cannot be/i) !== null ||
          document.querySelectorAll('p.kbt-msg-error, [class*="msg-error"]').length > 0
        )
        if (!hasErrors) throw new Error('Empty forgot-password form submit shows no validation errors')
      },
    },

    {
      name: 'Forgot password: submit does not crash the page',
      async fn(page) {
        await go(page, '/forgot-password')
        await wait(page, 1000)
        const textInput = page.locator('input[type="text"], input[name="employeeNo"]').first()
        const dateInput = page.locator('input[type="date"]').first()
        if (await textInput.count() === 0 || await dateInput.count() === 0) return
        await textInput.fill('EMP-QATEST')
        await dateInput.fill('1990-01-01')
        await page.locator('button[type="submit"]').first().click()
        await wait(page, 3000)
        // Either shows confirmation or an error — should not crash or go blank
        const text = await page.evaluate(() => document.body.innerText)
        if (text.length < 10) throw new Error('Page went blank after forgot-password submission')
        if (page.url().includes('/login')) throw new Error('Page redirected to /login unexpectedly after submit')
      },
    },
  ],
}
