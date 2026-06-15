const { newPage, screenshot, getSessionState } = require('./browser')
const cfg = require('../config')

/**
 * Execute a test suite definition.
 *
 * Suite definition shape:
 *   { name, viewport?, setup?, teardown?, tests: [{ name, fn }] }
 *
 * Each test fn receives (page, ctx) and should throw on failure.
 * Returns a suite result object.
 */
async function runSuite(suiteDef, adminSession = null) {
  const viewport  = suiteDef.viewport || 'desktop'
  // Auth suite tests its own login flow — starts without pre-auth
  // All other suites get pre-seeded admin session to avoid rate-limiter
  const session = suiteDef.name === 'auth' ? null : adminSession
  const { page, context } = await newPage(viewport, session)
  const results   = []
  const suiteStart = Date.now()

  try {
    // Setup failure skips the whole suite rather than crashing the robot
    // For non-auth suites with pre-seeded session, skip the setup login (already authed)
    const needsSetup = suiteDef.name === 'auth' || !session
    if (suiteDef.setup && needsSetup) {
      try {
        await suiteDef.setup(page, context)
      } catch (setupErr) {
        const msg = `Suite setup failed: ${setupErr.message?.slice(0, 200)}`
        for (const test of suiteDef.tests) {
          results.push({ name: test.name, status: 'skip', durationMs: 0, error: msg })
        }
        return { name: suiteDef.name, viewport, durationMs: Date.now() - suiteStart, tests: results, setupFailed: true }
      }
    }

    const maxAttempts = 1 + (cfg.retries || 0)

    for (const test of suiteDef.tests) {
      const start = Date.now()
      let lastErr = null

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt > 0) {
          await page.goto('about:blank').catch(() => {})
          await page.waitForTimeout(600)
        }
        try {
          await test.fn(page, context)
          lastErr = null
          break
        } catch (err) {
          lastErr = err
        }
      }

      if (!lastErr) {
        results.push({ name: test.name, status: 'pass', durationMs: Date.now() - start })
      } else {
        const shot = await screenshot(page, slugify(`${suiteDef.name}_${test.name}`)).catch(() => null)
        results.push({
          name:        test.name,
          status:      'fail',
          durationMs:  Date.now() - start,
          error:       lastErr.message?.slice(0, 300),
          screenshot:  shot,
        })
        await page.goto('about:blank').catch(() => {})
      }
    }

    if (suiteDef.teardown) await suiteDef.teardown(page, context).catch(() => {})
  } finally {
    await context.close().catch(() => {})
  }

  return {
    name:       suiteDef.name,
    viewport,
    durationMs: Date.now() - suiteStart,
    tests:      results,
  }
}

/**
 * Run all suite definitions, collect bugs from assertions, return run result.
 */
async function runAll(suiteDefs) {
  const runId     = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const startedAt = new Date().toISOString()
  const suites    = []
  const bugs      = []
  let bugNum      = 1

  function registerBug(sev, pg, desc, detail = '', screenshot = null) {
    const id = `BUG-${String(bugNum++).padStart(3, '0')}`
    bugs.push({ id, sev, page: pg, desc, detail, screenshot })
    return id
  }

  console.log(`\n🤖 QA Robot starting run ${runId}`)
  console.log(`   ${suiteDefs.length} suites scheduled`)

  // Pre-login once and share session — avoids hitting the auth rate limiter (20 req/15 min)
  let adminSession = null
  try {
    process.stdout.write('   Authenticating...')
    adminSession = await getSessionState(cfg.accounts.admin)
    process.stdout.write(' ✓\n\n')
  } catch (e) {
    process.stdout.write(` ✗ (${e.message}) — suites will attempt their own login\n\n`)
  }

  for (const def of suiteDefs) {
    process.stdout.write(`  ▸ ${def.name.padEnd(28)}`)
    const result = await runSuite(def, adminSession)
    suites.push(result)

    const fail = result.tests.filter(t => t.status === 'fail')
    const skip = result.tests.filter(t => t.status === 'skip')
    if (result.setupFailed) {
      process.stdout.write(`⚠  setup failed — ${skip.length} tests skipped  (${result.durationMs}ms)\n`)
    } else {
      process.stdout.write(
        fail.length === 0
          ? `✓  (${result.durationMs}ms)\n`
          : `✗  ${fail.length} failed  (${result.durationMs}ms)\n`
      )
    }

    // Convert test failures into bugs
    for (const t of fail) {
      if (t.status === 'fail') {
        const sev = deriveSeverity(t.name, def.name)
        registerBug(sev, def.name, t.name, t.error || '', t.screenshot)
      }
    }
  }

  // Also collect explicitly registered bugs from suite output
  for (const suite of suites) {
    if (suite.detectedBugs) {
      for (const b of suite.detectedBugs) {
        registerBug(b.sev, b.page, b.desc, b.detail, b.screenshot)
      }
    }
  }

  const allTests = suites.flatMap(s => s.tests)
  const total    = allTests.length
  const passed   = allTests.filter(t => t.status === 'pass').length
  const skipped  = allTests.filter(t => t.status === 'skip').length
  const failed   = total - passed - skipped
  const setupFailures = suites.filter(s => s.setupFailed).length

  const finishedAt  = new Date().toISOString()
  const durationMs  = Date.now() - new Date(startedAt).getTime()

  return {
    runId,
    startedAt,
    finishedAt,
    durationMs,
    suites,
    bugs,
    stats: { total, passed, failed, skipped, setupFailures },
  }
}

// Heuristic severity based on test/suite name keywords
function deriveSeverity(testName, suiteName) {
  const combined = `${suiteName} ${testName}`.toLowerCase()
  if (combined.match(/login|auth|session|logout|csrf|injection/)) return 'HIGH'
  if (combined.match(/crash|blank|error|500|fail.*load/))         return 'HIGH'
  if (combined.match(/save|submit|create|delete|data.*loss/))     return 'MEDIUM'
  if (combined.match(/mobile|responsive|layout/))                 return 'MEDIUM'
  if (combined.match(/label|style|color|placeholder|tooltip/))    return 'LOW'
  return 'MEDIUM'
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60)
}

module.exports = { runAll, runSuite }
