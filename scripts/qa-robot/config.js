/**
 * QA Robot — configuration
 * Edit this file to change targets, credentials, and schedule.
 */
module.exports = {
  // Target app
  baseUrl: process.env.QA_URL || 'http://localhost:5173',
  apiUrl:  process.env.QA_API  || 'http://localhost:3001',

  // Test accounts — must match prisma/seed.cjs
  accounts: {
    admin:    { identifier: 'admin@amw-ems.com',       password: 'P@ssw0rd!' },
    manager:  { identifier: 'manager.eng@amw-ems.com', password: 'P@ssw0rd!' },
    employee: { identifier: 'officer1@amw-ems.com',    password: 'P@ssw0rd!' },
  },

  // Scheduler
  intervalMinutes: 30,        // run every 30 min in watch mode
  runOnStart:      true,      // run immediately when started

  // Browser
  headless:  true,
  slowMo:    0,               // ms between actions (increase for debugging)
  timeout:   20_000,          // per-action timeout ms
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile',  width: 390,  height: 844 },
  ],

  // Output
  logsDir:        __dirname + '/logs',
  screenshotsDir: __dirname + '/screenshots',
  reportsDir:     __dirname + '/reports',
  keepLogsDays:   30,
  keepScreenshotsDays: 7,

  // Severity thresholds for exit code
  failOnSeverity: ['CRITICAL', 'HIGH'],   // non-zero exit if any of these found

  // Slack notifications
  // Set QA_SLACK_WEBHOOK env var, or paste webhook URL here directly
  slack: {
    webhookUrl: process.env.QA_SLACK_WEBHOOK || '',
    // Only notify when bugs at these severities are found
    notifyOnSeverity: ['CRITICAL', 'HIGH'],
    // Also send a "all clear" message when 0 bugs found
    notifyOnPass: false,
    // Mention @channel on CRITICAL bugs
    mentionChannelOnCritical: true,
  },
}
