/**
 * Slack notifier for QA Robot.
 * Uses Slack Incoming Webhooks — no SDK needed, plain HTTPS POST.
 *
 * Setup:
 *   1. Go to https://api.slack.com/apps → Create App → Incoming Webhooks
 *   2. Enable Incoming Webhooks → Add to a channel
 *   3. Copy the Webhook URL
 *   4. Set env var:  QA_SLACK_WEBHOOK=https://hooks.slack.com/services/xxx/yyy/zzz
 *      or paste it into config.js → slack.webhookUrl
 */

const https = require('https')
const cfg   = require('../config')

const SEV_EMOJI = {
  CRITICAL: '🔴',
  HIGH:     '🟠',
  MEDIUM:   '🟡',
  LOW:      '🔵',
  INFO:     '⚪',
}

/**
 * Send a Slack notification for a completed QA run.
 * @param {object} result — full run result from runAll()
 */
async function notify(result) {
  const webhook = cfg.slack?.webhookUrl
  if (!webhook) return // not configured — skip silently

  const bugs = result.bugs ?? []
  const notifyLevel = cfg.slack.notifyOnSeverity ?? ['CRITICAL', 'HIGH']
  const triggered = bugs.filter(b => notifyLevel.includes(b.sev))

  // Decide whether to send
  if (triggered.length === 0) {
    if (!cfg.slack.notifyOnPass) return // nothing to report
    await sendPass(webhook, result)
    return
  }

  await sendBugAlert(webhook, result, triggered)
}

async function sendBugAlert(webhook, result, triggered) {
  const hasCritical = triggered.some(b => b.sev === 'CRITICAL')
  const mention     = hasCritical && cfg.slack.mentionChannelOnCritical ? '<!channel> ' : ''

  const bugLines = triggered.map(b =>
    `${SEV_EMOJI[b.sev] || '❓'} *[${b.sev}]* ${b.suite} › ${b.test}\n   \`${b.error?.slice(0, 120) ?? 'unknown error'}\``
  ).join('\n\n')

  const runTime = new Date(result.startedAt).toLocaleString('th-TH', {
    dateStyle: 'short', timeStyle: 'short', hour12: false,
  })

  const payload = {
    text: `${mention}QA Robot พบ ${triggered.length} bug (${result.stats.failed}/${result.stats.total} tests failed)`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🤖 QA Robot — ${triggered.length} Bug${triggered.length > 1 ? 's' : ''} Found`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Run time:*\n${runTime}` },
          { type: 'mrkdwn', text: `*Tests:*\n${result.stats.passed} passed · ${result.stats.failed} failed · ${result.stats.skipped} skipped` },
          { type: 'mrkdwn', text: `*Target:*\n${result.baseUrl ?? cfg.baseUrl}` },
          { type: 'mrkdwn', text: `*Duration:*\n${((result.durationMs ?? 0) / 1000).toFixed(1)}s` },
        ],
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Bugs requiring attention:*\n\n${bugLines}` },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Full report: \`scripts/qa-robot/reports/latest.html\` · Log: \`scripts/qa-robot/logs/qa-robot.log\`` },
        ],
      },
    ],
  }

  // Add mention as first block if critical
  if (hasCritical && cfg.slack.mentionChannelOnCritical) {
    payload.blocks.unshift({
      type: 'section',
      text: { type: 'mrkdwn', text: `<!channel> *CRITICAL bug detected — needs immediate attention*` },
    })
  }

  await post(webhook, payload)
}

async function sendPass(webhook, result) {
  const runTime = new Date(result.startedAt).toLocaleString('th-TH', {
    dateStyle: 'short', timeStyle: 'short', hour12: false,
  })
  const payload = {
    text: `✅ QA Robot — all ${result.stats.total} tests passed`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `✅ *QA Robot — All Clear*\n${result.stats.total} tests passed · ${runTime}` },
      },
    ],
  }
  await post(webhook, payload)
}

function post(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const url  = new URL(webhookUrl)

    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.warn(`  [Slack] Warning: webhook returned ${res.statusCode} — ${data}`)
          } else {
            console.log(`  [Slack] Notification sent ✓`)
          }
          resolve()
        })
      }
    )

    req.on('error', err => {
      console.warn(`  [Slack] Failed to send notification: ${err.message}`)
      resolve() // don't let Slack failure crash the robot
    })

    req.write(body)
    req.end()
  })
}

module.exports = { notify }
