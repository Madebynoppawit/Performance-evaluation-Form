/**
 * QA Robot — configuration
 * Edit this file to change targets, credentials, and schedule.
 */
module.exports = {
  // Target app
  baseUrl: process.env.QA_URL || 'http://localhost:5173',
  apiUrl:  process.env.QA_API  || 'http://localhost:3001/api',

  // Test accounts — must match prisma/seed.cjs
  accounts: {
    admin:     { identifier: 'admin@amw-ems.com',       password: 'P@ssw0rd!' },
    manager:   { identifier: 'manager.eng@amw-ems.com', password: 'P@ssw0rd!' },
    employee:  { identifier: 'officer1@amw-ems.com',    password: 'P@ssw0rd!' },
    developer: { identifier: 'developer@amw-ems.com',   password: 'P@ssw0rd!' },
  },

  // Scheduler
  intervalMinutes: 30,
  runOnStart:      true,

  // Browser
  headless:  true,
  slowMo:    0,
  timeout:   20_000,   // per-action timeout ms
  retries:   1,        // retry a failing test once before marking failed

  viewports: [
    { name: 'desktop', width: 1440, height: 900  },
    { name: 'tablet',  width: 768,  height: 1024 },
    { name: 'mobile',  width: 390,  height: 844  },
  ],

  // Smoke mode — run only these suites for a quick pre-deploy check
  //   Enable:  QA_SMOKE=1 node scripts/qa-robot
  smokeMode:   process.env.QA_SMOKE === '1',
  smokeSuites: ['auth', 'dashboard', 'navigation'],

  // Output
  logsDir:             __dirname + '/logs',
  screenshotsDir:      __dirname + '/screenshots',
  reportsDir:          __dirname + '/reports',
  keepLogsDays:        30,
  keepScreenshotsDays: 7,

  // Severity thresholds for exit code
  failOnSeverity: ['CRITICAL', 'HIGH'],

  // Slack notifications
  slack: {
    webhookUrl:               process.env.QA_SLACK_WEBHOOK || '',
    notifyOnSeverity:         ['CRITICAL', 'HIGH'],
    notifyOnPass:             false,
    mentionChannelOnCritical: true,
  },
}
