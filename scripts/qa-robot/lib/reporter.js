const fs   = require('fs')
const path = require('path')
const cfg  = require('../config')

const SEV_ORDER  = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }
const SEV_EMOJI  = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵', INFO: '⚪' }
const SEV_COLOR  = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#ca8a04', LOW: '#2563eb', INFO: '#6b7280' }

/**
 * Save a run result to JSON + append to rolling log.
 * @param {object} result  { runId, startedAt, finishedAt, durationMs, suites, bugs, stats }
 */
function saveRun(result) {
  fs.mkdirSync(cfg.logsDir,   { recursive: true })
  fs.mkdirSync(cfg.reportsDir, { recursive: true })

  // 1) Per-run JSON
  const jsonFile = path.join(cfg.logsDir, `run-${result.runId}.json`)
  fs.writeFileSync(jsonFile, JSON.stringify(result, null, 2))

  // 2) Rolling plaintext log
  const logFile = path.join(cfg.logsDir, 'qa-robot.log')
  const lines = buildLogLines(result)
  fs.appendFileSync(logFile, lines.join('\n') + '\n\n')

  // 3) HTML report (overwritten each run — always shows latest)
  const html = buildHtml(result)
  const htmlFile = path.join(cfg.reportsDir, 'latest.html')
  fs.writeFileSync(htmlFile, html)

  // 4) History index (append one summary line per run)
  const historyFile = path.join(cfg.logsDir, 'history.ndjson')
  const summary = {
    runId:      result.runId,
    startedAt:  result.startedAt,
    durationMs: result.durationMs,
    total:      result.stats.total,
    passed:     result.stats.passed,
    failed:     result.stats.failed,
    skipped:    result.stats.skipped,
    setupFailures: result.stats.setupFailures,
    bugs:       result.bugs.length,
    critical:   result.bugs.filter(b => b.sev === 'CRITICAL').length,
    high:       result.bugs.filter(b => b.sev === 'HIGH').length,
  }
  fs.appendFileSync(historyFile, JSON.stringify(summary) + '\n')

  return { jsonFile, logFile, htmlFile }
}

function buildLogLines(r) {
  const hr = '═'.repeat(72)
  const ts = new Date(r.startedAt).toLocaleString('en-GB', { hour12: false })
  const lines = [
    hr,
    `  QA ROBOT RUN — ${ts}  (${r.durationMs}ms)  runId: ${r.runId}`,
    hr,
    `  Tests: ${r.stats.total}  Passed: ${r.stats.passed}  Failed: ${r.stats.failed}  Skipped: ${r.stats.skipped}  Setup failures: ${r.stats.setupFailures}  Bugs: ${r.bugs.length}`,
    '',
  ]

  // Suite results
  for (const suite of r.suites) {
    const ok = suite.tests.every(t => t.status === 'pass')
    lines.push(`  ${ok ? '✓' : '✗'} ${suite.name.padEnd(20)} ${suite.tests.length} tests  ${suite.durationMs}ms`)
    for (const t of suite.tests) {
      if (t.status === 'fail') {
        lines.push(`      ✗ ${t.name}`)
        lines.push(`        Error: ${t.error || 'unknown'}`)
        if (t.screenshot) lines.push(`        Screenshot: ${t.screenshot}`)
      }
    }
  }

  // Bug report
  if (r.bugs.length > 0) {
    lines.push('', '  BUGS DETECTED', '  ' + '─'.repeat(68))
    const sorted = [...r.bugs].sort((a, b) => (SEV_ORDER[a.sev] || 9) - (SEV_ORDER[b.sev] || 9))
    for (const b of sorted) {
      lines.push(`  [${b.sev.padEnd(8)}] ${b.id} | ${b.page.padEnd(20)} | ${b.desc}`)
      if (b.detail) lines.push(`             Detail: ${b.detail}`)
      if (b.screenshot) lines.push(`             Screenshot: ${b.screenshot}`)
    }
  } else if (r.stats.setupFailures > 0) {
    lines.push('', `  Run incomplete: ${r.stats.setupFailures} suite setup failure(s)`)
  } else {
    lines.push('', '  No bugs detected ✓')
  }

  return lines
}

function buildHtml(r) {
  const ts    = new Date(r.startedAt).toLocaleString('en-GB', { hour12: false })
  const pass  = r.stats.passed
  const fail  = r.stats.failed
  const total = r.stats.total
  const pct   = total > 0 ? Math.round((pass / total) * 100) : 0
  const sorted = [...r.bugs].sort((a, b) => (SEV_ORDER[a.sev] || 9) - (SEV_ORDER[b.sev] || 9))

  const bugRows = sorted.map(b => `
    <tr>
      <td><span class="badge" style="background:${SEV_COLOR[b.sev]}">${b.sev}</span></td>
      <td><strong>${b.id}</strong></td>
      <td>${b.page}</td>
      <td>${b.desc}${b.detail ? `<br><small style="color:#6b7280">${b.detail}</small>` : ''}</td>
      <td>${b.screenshot ? `<a href="${b.screenshot}" target="_blank">📷</a>` : '—'}</td>
    </tr>`).join('')

  const suiteRows = r.suites.map(s => {
    const ok = s.tests.every(t => t.status === 'pass')
    const testRows = s.tests.map(t => `
      <tr style="background:${t.status === 'fail' ? 'rgba(220,38,38,0.06)' : 'transparent'}">
        <td style="padding-left:32px">${t.status === 'pass' ? '✓' : '✗'}</td>
        <td>${t.name}</td>
        <td>${t.durationMs ?? '—'}ms</td>
        <td style="color:#dc2626;font-size:0.8rem">${t.error || ''}</td>
        <td>${t.screenshot ? `<a href="${t.screenshot}" target="_blank">📷</a>` : ''}</td>
      </tr>`).join('')
    return `
      <tr style="background:${ok ? 'rgba(34,197,94,0.05)' : 'rgba(220,38,38,0.05)'}">
        <td><strong>${ok ? '✓' : '✗'}</strong></td>
        <td colspan="4"><strong>${s.name}</strong> — ${s.tests.length} tests · ${s.durationMs}ms · viewport: ${s.viewport}</td>
      </tr>${testRows}`
  }).join('')

  // history chart data
  let historyRows = ''
  try {
    const histFile = path.join(cfg.logsDir, 'history.ndjson')
    if (fs.existsSync(histFile)) {
      const lines = fs.readFileSync(histFile, 'utf8').trim().split('\n').slice(-20)
      historyRows = lines.map(l => {
        try {
          const h = JSON.parse(l)
          const pct2 = h.total > 0 ? Math.round((h.passed/h.total)*100) : 0
          const dt = new Date(h.startedAt).toLocaleString('en-GB',{hour12:false,month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'})
          return `<tr><td>${dt}</td><td>${h.total}</td><td style="color:#16a34a">${h.passed}</td><td style="color:#dc2626">${h.failed}</td><td>${h.bugs}</td><td>${pct2}%</td></tr>`
        } catch { return '' }
      }).join('')
    }
  } catch {}

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>QA Robot — AMW EMS</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#0f0f1a;color:#e2e8f0;padding:24px;font-size:14px}
  h1{font-size:1.6rem;font-weight:800;margin-bottom:4px}
  h2{font-size:1rem;font-weight:700;margin:24px 0 10px;color:#94a3b8}
  .meta{font-size:0.8rem;color:#64748b;margin-bottom:20px}
  .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px}
  .stat{background:#1e1e2e;border:1px solid #2d2d44;border-radius:10px;padding:16px}
  .stat .label{font-size:0.7rem;color:#64748b;text-transform:uppercase;letter-spacing:.08em}
  .stat .value{font-size:2rem;font-weight:800;margin-top:4px}
  .green{color:#22c55e}.red{color:#ef4444}.orange{color:#f97316}.yellow{color:#eab308}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#1e1e2e;padding:10px 14px;text-align:left;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em}
  td{padding:9px 14px;border-bottom:1px solid #1e1e2e;vertical-align:top}
  tr:hover td{background:rgba(255,255,255,0.02)}
  .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:0.65rem;font-weight:700;color:#fff;letter-spacing:.04em}
  a{color:#818cf8;text-decoration:none}
  .section{background:#13131f;border:1px solid #1e1e2e;border-radius:12px;padding:16px;margin-bottom:20px}
  .no-bugs{padding:20px;text-align:center;color:#22c55e;font-weight:700;font-size:1.1rem}
</style>
</head>
<body>
<h1>🤖 QA Robot — AMW EMS</h1>
<p class="meta">Run ID: ${r.runId} &nbsp;|&nbsp; ${ts} &nbsp;|&nbsp; ${r.durationMs}ms</p>

<div class="stat-grid">
  <div class="stat"><div class="label">Total Tests</div><div class="value">${total}</div></div>
  <div class="stat"><div class="label">Passed</div><div class="value green">${pass}</div></div>
  <div class="stat"><div class="label">Failed</div><div class="value red">${fail}</div></div>
  <div class="stat"><div class="label">Pass Rate</div><div class="value ${pct >= 90 ? 'green' : pct >= 70 ? 'yellow' : 'red'}">${pct}%</div></div>
  <div class="stat"><div class="label">Bugs Found</div><div class="value ${r.bugs.length === 0 ? 'green' : 'red'}">${r.bugs.length}</div></div>
  <div class="stat"><div class="label">Critical/High</div><div class="value orange">${sorted.filter(b => ['CRITICAL','HIGH'].includes(b.sev)).length}</div></div>
</div>

<h2>BUGS</h2>
<div class="section">
  ${r.bugs.length === 0
    ? '<div class="no-bugs">✓ No bugs detected this run</div>'
    : `<table><thead><tr><th>Severity</th><th>ID</th><th>Page</th><th>Description</th><th>📷</th></tr></thead><tbody>${bugRows}</tbody></table>`}
</div>

<h2>TEST SUITES</h2>
<div class="section">
  <table><thead><tr><th></th><th>Suite / Test</th><th>Duration</th><th>Error</th><th>📷</th></tr></thead>
  <tbody>${suiteRows}</tbody></table>
</div>

${historyRows ? `
<h2>RUN HISTORY (last 20)</h2>
<div class="section">
  <table><thead><tr><th>Time</th><th>Total</th><th>Pass</th><th>Fail</th><th>Bugs</th><th>Rate</th></tr></thead>
  <tbody>${historyRows}</tbody></table>
</div>` : ''}

<p class="meta" style="margin-top:24px">Generated by QA Robot v1.0 — AMW Performance Evaluation System</p>
</body></html>`
}

/**
 * Print a run summary to stdout.
 */
function printSummary(result) {
  const hr = '═'.repeat(64)
  const ts = new Date(result.startedAt).toLocaleString('en-GB', { hour12: false })
  console.log(`\n${hr}`)
  console.log(`  QA ROBOT — ${ts}`)
  console.log(`  ${result.stats.passed}/${result.stats.total} passed · ${result.bugs.length} bugs · ${result.durationMs}ms`)
  console.log(hr)
  const sorted = [...result.bugs].sort((a, b) => (SEV_ORDER[a.sev] || 9) - (SEV_ORDER[b.sev] || 9))
  if (result.stats.setupFailures > 0) {
    console.log(`  Run incomplete: ${result.stats.setupFailures} suite setup failure(s), ${result.stats.skipped} test(s) skipped`)
  } else if (sorted.length) {
    sorted.forEach(b => console.log(`  ${SEV_EMOJI[b.sev]} [${b.sev.padEnd(8)}] ${b.id} | ${b.page.padEnd(18)} | ${b.desc}`))
  } else {
    console.log('  ✅ All clear — no bugs found')
  }
  console.log()
}

module.exports = { saveRun, printSummary }
