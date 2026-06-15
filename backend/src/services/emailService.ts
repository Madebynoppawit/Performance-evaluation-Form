import nodemailer from 'nodemailer'
import { env } from '../config/env'

// ── Transport ─────────────────────────────────────────────────────────────────
// When SMTP_HOST is not configured the service logs emails to stdout instead of
// sending them. This keeps the app fully functional in dev/demo environments
// without requiring an SMTP server.

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host:   env.SMTP_HOST,
      port:   env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
      auth:   env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    })
  : null

async function send(opts: { to: string; subject: string; html: string; text: string }) {
  if (!transporter) {
    // Log-only mode — print a redacted summary so devs can verify the trigger.
    console.info(`[email:log-only] to=${opts.to} | subject=${opts.subject}`)
    return
  }
  try {
    await transporter.sendMail({ from: env.SMTP_FROM, ...opts })
  } catch (err) {
    // Never let a failed email crash the API — just log.
    console.error('[email] Failed to send:', (err as Error).message)
  }
}

// ── Shared layout ─────────────────────────────────────────────────────────────
function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f4f6fb; color:#1a1f2e; }
  .wrap { max-width:560px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }
  .top  { background:#1f3961; padding:24px 32px; }
  .top h1 { margin:0; font-size:15px; font-weight:700; color:#fff; letter-spacing:.04em; }
  .top p  { margin:4px 0 0; font-size:12px; color:#a0bce0; }
  .body { padding:28px 32px; }
  .body h2 { margin:0 0 12px; font-size:20px; font-weight:800; color:#1f3961; }
  .body p  { margin:0 0 14px; font-size:14px; line-height:1.6; color:#374151; }
  .cta  { display:inline-block; margin:8px 0 18px; padding:12px 24px; background:#1f3961; color:#fff; font-size:14px; font-weight:700; text-decoration:none; border-radius:8px; }
  .meta { background:#f8faff; border-radius:8px; padding:14px 18px; margin:12px 0; font-size:13px; color:#4b5563; }
  .meta b { color:#1f3961; }
  .foot { padding:16px 32px; background:#f4f6fb; font-size:11px; color:#9ca3af; text-align:center; }
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <h1>AMW · Performance Evaluation System</h1>
    <p>${title}</p>
  </div>
  <div class="body">${body}</div>
  <div class="foot">This is an automated message from AMW EMS. Do not reply to this email.</div>
</div>
</body>
</html>`
}

// ── Notification functions ────────────────────────────────────────────────────

export async function sendPasswordReset(opts: {
  to: string
  name: string
  resetUrl: string
}) {
  const html = layout('Password Reset', `
    <h2>Reset your password</h2>
    <p>Hi <b>${opts.name}</b>,</p>
    <p>A password reset was requested for your account. This link expires shortly.</p>
    <a href="${opts.resetUrl}" class="cta">Reset Password</a>
    <p>If you did not request this, you can ignore this message.</p>
  `)
  const text = `Hi ${opts.name},\n\nReset your password: ${opts.resetUrl}\n\nIf you did not request this, ignore this message.`
  await send({ to: opts.to, subject: '[AMW EMS] Password reset request', html, text })
}

/** Evaluator is notified when a new evaluation is created and assigned to them. */
export async function sendEvaluationAssigned(opts: {
  to: string
  evaluatorName: string
  evaluateeName: string
  formType: string
  cycleTitle: string
  appUrl: string
  evaluationId: string
}) {
  const { to, evaluatorName, evaluateeName, formType, cycleTitle, appUrl, evaluationId } = opts
  const link = `${appUrl}/evaluations/${evaluationId}`
  const html = layout('New Evaluation Assigned', `
    <h2>New evaluation assigned</h2>
    <p>Hi <b>${evaluatorName}</b>,</p>
    <p>You have been assigned to evaluate <b>${evaluateeName}</b>.</p>
    <div class="meta">
      <p><b>Evaluatee:</b> ${evaluateeName}</p>
      <p><b>Form:</b> ${formType}</p>
      <p><b>Cycle:</b> ${cycleTitle}</p>
    </div>
    <a href="${link}" class="cta">Open Evaluation →</a>
    <p style="font-size:12px;color:#9ca3af;">Or copy this link: ${link}</p>
  `)
  const text = `Hi ${evaluatorName},\n\nYou have been assigned to evaluate ${evaluateeName} (${formType} · ${cycleTitle}).\n\nOpen evaluation: ${link}`
  await send({ to, subject: `[AMW EMS] New evaluation — ${evaluateeName}`, html, text })
}

/** Reviewer (2nd-stage manager) is notified when an evaluation is pending their review. */
export async function sendPendingReview(opts: {
  to: string
  reviewerName: string
  evaluateeName: string
  evaluatorName: string
  appUrl: string
  evaluationId: string
}) {
  const { to, reviewerName, evaluateeName, evaluatorName, appUrl, evaluationId } = opts
  const link = `${appUrl}/evaluations/${evaluationId}`
  const html = layout('Evaluation Awaiting Your Review', `
    <h2>Review requested</h2>
    <p>Hi <b>${reviewerName}</b>,</p>
    <p><b>${evaluatorName}</b> has completed an evaluation of <b>${evaluateeName}</b> and it is now awaiting your second-stage review.</p>
    <div class="meta">
      <p><b>Evaluatee:</b> ${evaluateeName}</p>
      <p><b>Evaluator:</b> ${evaluatorName}</p>
      <p><b>Action needed:</b> Review and approve</p>
    </div>
    <a href="${link}" class="cta">Review Now →</a>
    <p style="font-size:12px;color:#9ca3af;">Or copy this link: ${link}</p>
  `)
  const text = `Hi ${reviewerName},\n\n${evaluatorName} has submitted an evaluation of ${evaluateeName} for your second-stage review.\n\nOpen evaluation: ${link}`
  await send({ to, subject: `[AMW EMS] Review needed — ${evaluateeName}`, html, text })
}

/** Evaluatee is notified when their evaluation has been reviewed and is ready to acknowledge. */
export async function sendReadyToAcknowledge(opts: {
  to: string
  evaluateeName: string
  appUrl: string
  evaluationId: string
}) {
  const { to, evaluateeName, appUrl, evaluationId } = opts
  const link = `${appUrl}/evaluations/${evaluationId}`
  const html = layout('Your Evaluation is Ready', `
    <h2>Your evaluation is complete</h2>
    <p>Hi <b>${evaluateeName}</b>,</p>
    <p>Your performance evaluation has been completed and is ready for your acknowledgement.</p>
    <p>Please review your evaluation results and sign to confirm you have read and understood the feedback.</p>
    <a href="${link}" class="cta">View & Acknowledge →</a>
    <p style="font-size:12px;color:#9ca3af;">Or copy this link: ${link}</p>
  `)
  const text = `Hi ${evaluateeName},\n\nYour performance evaluation has been completed. Please log in to review and acknowledge it.\n\nOpen evaluation: ${link}`
  await send({ to, subject: `[AMW EMS] Your evaluation is ready — please acknowledge`, html, text })
}

/** Evaluator is notified when the evaluatee has acknowledged the evaluation. */
export async function sendAcknowledged(opts: {
  to: string
  evaluatorName: string
  evaluateeName: string
  appUrl: string
  evaluationId: string
}) {
  const { to, evaluatorName, evaluateeName, appUrl, evaluationId } = opts
  const link = `${appUrl}/evaluations/${evaluationId}`
  const html = layout('Evaluation Acknowledged', `
    <h2>Evaluation acknowledged</h2>
    <p>Hi <b>${evaluatorName}</b>,</p>
    <p><b>${evaluateeName}</b> has acknowledged their performance evaluation. The process is now complete.</p>
    <a href="${link}" class="cta">View Evaluation →</a>
  `)
  const text = `Hi ${evaluatorName},\n\n${evaluateeName} has acknowledged their performance evaluation.\n\nView: ${link}`
  await send({ to, subject: `[AMW EMS] ${evaluateeName} acknowledged their evaluation`, html, text })
}
