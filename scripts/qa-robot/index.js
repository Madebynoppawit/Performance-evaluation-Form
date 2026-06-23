#!/usr/bin/env node
/**
 * QA Robot — AMW Performance Evaluation System
 *
 * Usage:
 *   node scripts/qa-robot          # run once
 *   node scripts/qa-robot --watch  # run on schedule (see config.intervalMinutes)
 *   node scripts/qa-robot --suite auth        # run single suite
 *   node scripts/qa-robot --url http://...    # override target URL
 *   node scripts/qa-robot --api http://...    # override API URL
 *
 * Exit codes:
 *   0  — all tests passed (or only LOW/INFO bugs)
 *   1  — HIGH or CRITICAL bugs found
 *   2  — robot setup/launch error
 */

const cfg      = require('./config')
const { runAll }       = require('./lib/runner')
const { closeBrowser } = require('./lib/browser')
const { saveRun, printSummary } = require('./lib/reporter')
const { notify } = require('./lib/notifier')
const fs = require('fs')

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2)
const watch   = args.includes('--watch')
const _suiteIdx = args.indexOf('--suite')
const suiteArg = args.find(a => a.startsWith('--suite='))?.split('=').slice(1).join('=')
  || (_suiteIdx >= 0 && args[_suiteIdx + 1] && !args[_suiteIdx + 1].startsWith('--') ? args[_suiteIdx + 1] : null)

const _urlIdx = args.indexOf('--url')
const urlArg = args.find(a => a.startsWith('--url='))?.split('=').slice(1).join('=')
  || (_urlIdx >= 0 && args[_urlIdx + 1] && !args[_urlIdx + 1].startsWith('--') ? args[_urlIdx + 1] : null)
if (urlArg) {
  cfg.baseUrl = urlArg.replace(/\/+$/, '')
  cfg.apiUrl = `${cfg.baseUrl}/api`
}

const _apiIdx = args.indexOf('--api')
const apiArg = args.find(a => a.startsWith('--api='))?.split('=').slice(1).join('=')
  || (_apiIdx >= 0 && args[_apiIdx + 1] && !args[_apiIdx + 1].startsWith('--') ? args[_apiIdx + 1] : null)
if (apiArg) cfg.apiUrl = apiArg.replace(/\/+$/, '')

// ── Load suite definitions ────────────────────────────────────────────────────
const ALL_SUITES = [
  require('./suites/auth'),
  require('./suites/dashboard'),
  require('./suites/navigation'),
  require('./suites/evaluations'),
  require('./suites/forms'),
  require('./suites/users'),
  require('./suites/reports'),
  require('./suites/calibration'),
  require('./suites/rbac'),
  require('./suites/api'),
  require('./suites/network'),
  require('./suites/mobile'),
  require('./suites/tablet'),
  require('./suites/performance'),
]

const smokeArg = args.includes('--smoke')

function getActiveSuites() {
  let suites = ALL_SUITES
  // --smoke or QA_SMOKE=1: run only the smoke subset
  if (smokeArg || cfg.smokeMode) {
    suites = ALL_SUITES.filter(s => cfg.smokeSuites.includes(s.name))
    console.log(`  [smoke] Running ${suites.length} suites: ${suites.map(s => s.name).join(', ')}`)
  }
  if (!suiteArg) return suites
  const found = suites.filter(s => s.name.toLowerCase().includes(suiteArg.toLowerCase()))
  if (found.length === 0) {
    console.error(`Unknown suite: "${suiteArg}". Available: ${ALL_SUITES.map(s => s.name).join(', ')}`)
    process.exit(2)
  }
  return found
}

// ── Single run ────────────────────────────────────────────────────────────────
async function runOnce() {
  const suites = getActiveSuites()
  let result

  try {
    result = await runAll(suites)
  } catch (err) {
    console.error('Robot encountered a fatal error:', err.message)
    await closeBrowser().catch(() => {})
    process.exit(2)
  }

  await closeBrowser().catch(() => {})

  const { jsonFile, logFile, htmlFile } = saveRun(result)
  printSummary(result)

  console.log(`  📄 JSON log : ${jsonFile}`)
  console.log(`  📝 Text log : ${logFile}`)
  console.log(`  🌐 HTML     : ${htmlFile}`)

  // Slack notification (non-blocking, won't crash on failure)
  await notify(result).catch(err => console.warn(`  [Slack] ${err.message}`))

  // Exit code based on severity
  if (result.stats.setupFailures > 0) return 2
  const critical = result.bugs.filter(b => cfg.failOnSeverity.includes(b.sev))
  return critical.length > 0 ? 1 : 0
}

// ── Watch mode (scheduler) ────────────────────────────────────────────────────
async function runWatch() {
  const intervalMs = cfg.intervalMinutes * 60 * 1000
  console.log(`\n🤖 QA Robot — WATCH MODE`)
  console.log(`   Target  : ${cfg.baseUrl}`)
  console.log(`   Interval: every ${cfg.intervalMinutes} minutes`)
  console.log(`   Suites  : ${getActiveSuites().map(s => s.name).join(', ')}`)
  console.log(`   Logs    : ${cfg.logsDir}`)
  console.log('\n   Press Ctrl+C to stop\n')

  let runCount = 0

  async function tick() {
    runCount++
    console.log(`\n[Run #${runCount}] ${new Date().toLocaleString('en-GB', { hour12: false })}`)
    try {
      await runOnce()
    } catch (err) {
      console.error(`  Run #${runCount} failed: ${err.message}`)
    }
  }

  if (cfg.runOnStart) await tick()

  const interval = setInterval(tick, intervalMs)

  // Graceful shutdown
  process.on('SIGINT',  () => { clearInterval(interval); shutdown() })
  process.on('SIGTERM', () => { clearInterval(interval); shutdown() })
}

async function shutdown() {
  console.log('\n\n🛑 QA Robot shutting down...')
  await closeBrowser().catch(() => {})
  process.exit(0)
}

// ── Housekeeping: prune old files ─────────────────────────────────────────────
function pruneOldFiles(dir, days) {
  if (!fs.existsSync(dir)) return
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  fs.readdirSync(dir).forEach(f => {
    const fp = require('path').join(dir, f)
    try {
      const stat = fs.statSync(fp)
      if (stat.mtimeMs < cutoff) fs.unlinkSync(fp)
    } catch {}
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────
;(async () => {
  // Prune old files on startup
  pruneOldFiles(cfg.logsDir,        cfg.keepLogsDays)
  pruneOldFiles(cfg.screenshotsDir, cfg.keepScreenshotsDays)

  if (watch) {
    await runWatch()
  } else {
    const code = await runOnce()
    process.exit(code)
  }
})().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(2)
})
