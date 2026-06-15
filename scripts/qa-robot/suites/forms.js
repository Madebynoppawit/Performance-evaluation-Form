/**
 * Form validation tests — cycles, account, settings.
 */
const cfg  = require('../config')
const { login } = require('../lib/browser')

const go   = (page, path) => page.goto(cfg.baseUrl + path, { waitUntil: 'load' })
const wait = (page, ms)   => page.waitForTimeout(ms)
const cnt  = async (page, sel) => page.locator(sel).count()

module.exports = {
  name: 'forms',
  viewport: 'desktop',

  async setup(page) {
    const { ok } = await login(page, cfg.accounts.admin)
    if (!ok) throw new Error('Forms suite: login failed in setup')
  },

  tests: [
    {
      name: 'Cycles: New Cycle modal opens',
      async fn(page) {
        await go(page, '/cycles')
        await wait(page, 1500)
        const btn = page.locator('button').filter({ hasText: /New cycle|^New$|Create cycle/i }).first()
        if (await btn.count() === 0) throw new Error('No "New Cycle" button on Cycles page')
        await btn.click()
        await wait(page, 1000)
        const modal = await page.evaluate(() => !!document.querySelector('.kbt-modal-backdrop'))
        if (!modal) throw new Error('Cycle creation modal did not open')
        await page.keyboard.press('Escape')
        await wait(page, 400)
      },
    },

    {
      name: 'Cycles: modal has name + date fields',
      async fn(page) {
        await go(page, '/cycles')
        await wait(page, 1500)
        const btn = page.locator('button').filter({ hasText: /New cycle|^New$/i }).first()
        if (await btn.count() === 0) return // skip if button absent
        await btn.click()
        await wait(page, 1000)
        const nameInp = await cnt(page, 'input[type="text"], input[name="name"]')
        const dateInp = await cnt(page, 'input[type="date"]')
        if (nameInp === 0) throw new Error('Cycle modal has no name text input')
        if (dateInp < 2)   throw new Error(`Cycle modal has ${dateInp} date input(s), expected at least 2`)
        await page.keyboard.press('Escape')
      },
    },

    {
      name: 'Cycles: end-date < start-date triggers validation',
      async fn(page) {
        await go(page, '/cycles')
        await wait(page, 1500)
        const btn = page.locator('button').filter({ hasText: /New cycle|^New$/i }).first()
        if (await btn.count() === 0) return
        await btn.click()
        await wait(page, 1000)
        const dates = page.locator('input[type="date"]')
        if (await dates.count() < 2) { await page.keyboard.press('Escape'); return }
        await dates.nth(0).fill('2026-06-01')
        await dates.nth(1).fill('2026-01-01') // end before start
        await wait(page, 300)
        const errVisible = await page.evaluate(() => {
          const t = document.body.innerText
          return /end.*before|date.*invalid|invalid.*date|after the start/i.test(t)
        })
        if (!errVisible) throw new Error('No validation error shown when end date < start date')
        await page.keyboard.press('Escape')
      },
    },

    {
      name: 'Account: personal details form is present',
      async fn(page) {
        await go(page, '/account')
        await wait(page, 2000)
        // AccountPage inputs use className="kbt-input" without explicit name attributes
        // and some fields default to type="text" (no attribute), so use .kbt-input selector
        const inputs = await cnt(page, '.kbt-input, input[type="date"], input[type="email"], input[type="password"]')
        if (inputs === 0) throw new Error('No input fields (.kbt-input) found on Account page')
      },
    },

    {
      name: 'Account: save button is reachable',
      async fn(page) {
        await go(page, '/account')
        await wait(page, 1500)
        // Save button may be always visible or behind Edit
        const saveAlways = await cnt(page, 'button:has-text("Save"), button[type="submit"]')
        const editBtn    = await cnt(page, 'button:has-text("Edit")')
        if (saveAlways === 0 && editBtn === 0)
          throw new Error('Neither Save nor Edit button found on Account page')
      },
    },

    {
      name: 'Settings: preference toggles are interactive',
      async fn(page) {
        await go(page, '/settings')
        await wait(page, 1500)
        const toggles = await cnt(page, 'input[type="checkbox"], input[type="radio"], [role="switch"]')
        if (toggles === 0) throw new Error('No preference toggles found on Settings page')
      },
    },

    {
      name: 'Settings: theme switch works',
      async fn(page) {
        await go(page, '/settings')
        await wait(page, 1000)
        const themeEl = page.locator('.kbt-theme-switch, [class*="theme-switch"]').first()
        if (await themeEl.count() === 0) throw new Error('Theme switch not found on Settings page')
        const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
        await themeEl.click()
        await wait(page, 500)
        const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
        if (before === after) throw new Error('Theme did not change after clicking theme switch')
        // Reset
        await themeEl.click()
        await wait(page, 300)
      },
    },

    {
      name: 'Template list page loads with items',
      async fn(page) {
        await go(page, '/templates')
        await wait(page, 2000)
        const t = await page.evaluate(() => document.body.innerText)
        if (!t.match(/template/i)) throw new Error('Templates page has no "template" text')
      },
    },

    {
      name: 'Data Management shows file import control',
      async fn(page) {
        await go(page, '/data')
        await wait(page, 2000)
        const fileInp  = await cnt(page, 'input[type="file"]')
        const importEl = await cnt(page, 'button:has-text("Import"), label:has-text("Import")')
        if (fileInp + importEl === 0)
          throw new Error('No file import control found on Data Management page')
      },
    },

    // ── Account password validation (v1.1.0 feature) ────────────────────────
    {
      name: 'Account: confirm password mismatch shows red border',
      async fn(page) {
        await go(page, '/account')
        await wait(page, 2000)
        const passwordInputs = page.locator('input[type="password"]')
        const count = await passwordInputs.count()
        if (count < 2) { console.warn('  [SKIP] Less than 2 password inputs on account page'); return }

        // Fill mismatched passwords
        await passwordInputs.nth(0).fill('NewPassword1!')
        await passwordInputs.nth(1).fill('DifferentPassword2!')
        await wait(page, 400)

        // Confirm password input should get red border when values differ
        const hasRedBorder = await passwordInputs.nth(1).evaluate(el => {
          const style = el.style.borderColor || window.getComputedStyle(el).borderColor
          // App sets inline style borderColor to var(--kbt-danger) on mismatch
          return el.style.borderColor.includes('var(--kbt-danger)') ||
                 el.style.borderColor !== '' ||
                 el.getAttribute('style')?.includes('kbt-danger') ||
                 el.getAttribute('style')?.includes('#e52') // kbt-danger hex
        })
        if (!hasRedBorder) {
          // Fallback: try clicking save and check for error message
          const saveBtn = page.locator('button.kbt-btn-primary').first()
          if (await saveBtn.count() > 0) {
            await saveBtn.click()
            await wait(page, 600)
            const text = await page.evaluate(() => document.body.innerText)
            if (!text.match(/mismatch|do not match|password.*confirm|ไม่ตรงกัน/i))
              throw new Error('No mismatch error shown when passwords differ')
          }
        }
        // Clear passwords to reset state
        await passwordInputs.nth(0).fill('')
        await passwordInputs.nth(1).fill('')
      },
    },

    {
      name: 'Account: matching passwords clear the mismatch indicator',
      async fn(page) {
        await go(page, '/account')
        await wait(page, 2000)
        const passwordInputs = page.locator('input[type="password"]')
        if (await passwordInputs.count() < 2) return

        // Enter mismatched then fix them
        await passwordInputs.nth(0).fill('MatchingPass1!')
        await passwordInputs.nth(1).fill('WrongPass1!')
        await wait(page, 300)
        await passwordInputs.nth(1).fill('MatchingPass1!')
        await wait(page, 300)

        // Border should be gone (or default colour)
        const hasDangerBorder = await passwordInputs.nth(1).evaluate(el =>
          el.getAttribute('style')?.includes('kbt-danger') ||
          el.getAttribute('style')?.includes('#e52') || false
        )
        if (hasDangerBorder) throw new Error('Red border still showing after passwords were made to match')

        await passwordInputs.nth(0).fill('')
        await passwordInputs.nth(1).fill('')
      },
    },
  ],
}
