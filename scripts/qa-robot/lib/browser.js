const { chromium } = require('playwright')
const cfg = require('../config')
const path = require('path')
const fs   = require('fs')

let _browser = null

// Cached storage states per account identifier — avoids re-login on every suite
const _sessionCache = {}

async function getBrowser() {
  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({ headless: cfg.headless, slowMo: cfg.slowMo })
  }
  return _browser
}

async function closeBrowser() {
  if (_browser) { await _browser.close(); _browser = null }
  // Clear session cache so next robot run starts fresh
  Object.keys(_sessionCache).forEach(k => delete _sessionCache[k])
}

/**
 * Create a page context for a given viewport.
 * If sessionDesc is provided ({ storageState, sessionEntries }), the context
 * starts pre-authenticated — cookies via storageState, sessionStorage via
 * addInitScript (since Playwright's storageState API skips sessionStorage).
 * Returns { page, context } — caller must close context when done.
 */
async function newPage(viewportName = 'desktop', sessionDesc = null) {
  const vp = cfg.viewports.find(v => v.name === viewportName) || cfg.viewports[0]
  const browser = await getBrowser()
  const ctxOpts = {
    viewport:  { width: vp.width, height: vp.height },
    userAgent: 'QABot/1.0 (AMW-EMS automated tester)',
  }
  if (sessionDesc?.storageState) ctxOpts.storageState = sessionDesc.storageState
  const context = await browser.newContext(ctxOpts)
  context.setDefaultTimeout(cfg.timeout)

  // Inject sessionStorage before ANY page navigation via init script
  if (sessionDesc?.sessionEntries && Object.keys(sessionDesc.sessionEntries).length > 0) {
    await context.addInitScript((entries) => {
      for (const [k, v] of Object.entries(entries)) {
        try { sessionStorage.setItem(k, v) } catch {}
      }
    }, sessionDesc.sessionEntries)
  }

  const page = await context.newPage()
  return { page, context }
}

/**
 * Log in with given credentials. Retries once on failure.
 * Returns { ok, error }.
 */
async function login(page, account = cfg.accounts.admin, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    await page.goto(cfg.baseUrl + '/login', { waitUntil: 'load' })
    await page.waitForTimeout(1000)
    await page.fill('input[name="identifier"]', account.identifier)
    await page.fill('input[type="password"]',  account.password)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3500)
    const ok = !page.url().includes('/login')
    if (ok) return { ok: true, error: null }
    if (attempt < retries) await page.waitForTimeout(1500) // brief pause before retry
  }
  return { ok: false, error: `Login failed after ${retries + 1} attempt(s) — still on login page` }
}

/**
 * Get a cached session descriptor for an account.
 * Logs in once, captures cookies + the sessionStorage auth key, caches for reuse.
 * Returns { storageState, sessionEntries } — both needed for full auth injection.
 *
 * NOTE: Playwright's storageState() captures cookies + localStorage but NOT
 * sessionStorage. We extract the auth-storage key manually and inject it via
 * addInitScript in newPage().
 */
async function getSessionState(account = cfg.accounts.admin) {
  const key = account.identifier
  if (_sessionCache[key]) return _sessionCache[key]

  const browser = await getBrowser()
  const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ctx.setDefaultTimeout(cfg.timeout)
  const page = await ctx.newPage()

  try {
    const { ok, error } = await login(page, account)
    if (!ok) throw new Error(error)
    await page.waitForTimeout(1000) // let app settle

    // Capture cookies/localStorage via Playwright API
    const storageState = await ctx.storageState()

    // Extract sessionStorage manually (Playwright doesn't include it in storageState)
    const sessionEntries = await page.evaluate(() => {
      const out = {}
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)
        out[k] = sessionStorage.getItem(k)
      }
      return out
    })

    const cached = { storageState, sessionEntries }
    _sessionCache[key] = cached
    return cached
  } finally {
    await ctx.close().catch(() => {})
  }
}

/**
 * Take a screenshot and save to screenshots dir.
 * Returns relative file path.
 */
async function screenshot(page, name) {
  fs.mkdirSync(cfg.screenshotsDir, { recursive: true })
  const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const file = path.join(cfg.screenshotsDir, `${ts}_${name}.png`)
  await page.screenshot({ path: file, fullPage: true }).catch(() => {})
  return file
}

module.exports = { newPage, closeBrowser, login, getSessionState, screenshot }
