import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:5173'
const outDir = path.resolve('docs/screenshots')

const user = {
  id: 'user-admin',
  email: 'admin@amw-ems.com',
  name: 'Ariya Chen',
  role: 'ADMIN',
  position: 'MANAGER',
  department: 'People Operations',
}

const evaluation = {
  id: 'eval-1',
  cycleId: 'cycle-1',
  cycle: {
    id: 'cycle-1',
    name: 'FY2026 Leadership Review',
    description: 'Annual performance cycle',
    templateId: 'template-1',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  evaluateeId: 'employee-1',
  evaluatee: {
    id: 'employee-1',
    email: 'mina@amw-ems.com',
    name: 'Mina Laurent',
    role: 'EMPLOYEE',
    position: 'OFFICER',
    department: 'Manufacturing Excellence',
  },
  evaluatorId: 'user-admin',
  evaluator: user,
  type: 'MANAGER',
  status: 'REVIEWED',
  goalWeight: 50,
  competencyWeight: 30,
  attendanceWeight: 20,
  goalScore: 4.5,
  competencyScore: 4.2,
  attendanceScore: 4.8,
  totalScore: 4.48,
  submittedAt: '2026-06-01T08:00:00.000Z',
  answers: [],
  goalEntries: [{
    id: 'goal-1',
    goal: 'Launch calibrated review governance',
    goalDescription: 'Raise completion quality across business units',
    weight: 60,
    result: 'Completed with executive sign-off',
    evaluationScore: 4.6,
    order: 1,
    targetRating1: '0',
    targetRating2: '50',
    targetRating3: '75',
    targetRating4: '90',
    targetRating5: '100',
  }],
  competencyScores: [
    { competencyId: 'global_mindset', score: 4.3 },
    { competencyId: 'systematic_thinking', score: 4.2 },
    { competencyId: 'communication', score: 4.4 },
    { competencyId: 'teamwork', score: 4.1 },
    { competencyId: 'customer_focus', score: 4.5 },
  ],
  attendanceRecord: {
    leaveActualDays: 2,
    lateActualTimes: 0,
    disciplinaryLevel: 'NONE',
    leaveScore: 4.8,
    lateScore: 5,
    disciplinaryScore: 5,
    attendanceAvgScore: 4.93,
  },
  comment: {
    strengths: 'Strong ownership, clear stakeholder communication, and consistent follow-through.',
    improvements: 'Continue mentoring junior reviewers on evidence quality.',
    requiredSkills: 'Executive storytelling and calibration facilitation.',
  },
  salarySummary: {
    oldSalary: 85000,
    newSalary: 93000,
    bonus: 150000,
    bonusDeduction: 0,
    bonusPolicy: 'Leadership performance pool',
    effectiveDate: '2026-07-01T00:00:00.000Z',
  },
  acknowledgement: {
    employeeSignedAt: '2026-06-01T09:00:00.000Z',
    evaluatorSignedAt: '2026-06-01T10:00:00.000Z',
    directorSignedAt: '2026-06-02T10:00:00.000Z',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T12:00:00.000Z',
}

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const method = route.request().method()
    const url = new URL(route.request().url())
    const pathName = url.pathname.replace(/^\/api/, '')

    if (pathName === '/dashboard/stats') {
      await route.fulfill({ json: {
        totalEvaluations: 18,
        completedEvaluations: 14,
        pendingEvaluations: 4,
        averageScore: 4.22,
        totalUsers: 72,
        activeCycles: 2,
      } })
      return
    }

    if (pathName === '/health') {
      await route.fulfill({ json: {
        status: 'ok',
        version: '0.2.0-rc.1',
        env: 'demo',
        checkedAt: '2026-06-08T10:00:00.000Z',
        latencyMs: 18,
        requestId: 'readme-screenshot',
        services: { api: 'ok', auth: 'ok', database: 'ok' },
        release: { channel: 'standard', aiEnabled: false, aiProvider: 'none' },
      } })
      return
    }

    if (pathName === '/evaluations') {
      await route.fulfill({ json: [evaluation] })
      return
    }

    if (pathName === '/evaluations/eval-1') {
      await route.fulfill({ json: evaluation })
      return
    }

    if (pathName === '/cycles') {
      await route.fulfill({ json: [evaluation.cycle] })
      return
    }

    if (pathName === '/users') {
      await route.fulfill({ json: [user, evaluation.evaluatee] })
      return
    }

    if (pathName === '/reports/summary') {
      await route.fulfill({ json: [{
        cycleId: 'cycle-1',
        cycleName: 'FY2026 Leadership Review',
        averageScore: 4.32,
        totalEvaluations: 18,
        completedEvaluations: 14,
        byDepartment: [
          { department: 'Manufacturing Excellence', averageScore: 4.48 },
          { department: 'People Operations', averageScore: 4.12 },
        ],
      }] })
      return
    }

    await route.fulfill({ status: 404, json: { message: `Unhandled screenshot route: ${pathName} ${method}` } })
  })
}

async function signIn(page) {
  await page.addInitScript((authUser) => {
    window.localStorage.setItem('theme-mode', 'light')
    window.sessionStorage.setItem('amw-skip-splash', 'true')
    window.sessionStorage.setItem(
      'auth-storage',
      JSON.stringify({ state: { user: authUser, token: 'screenshot-token', expiresAt: Date.now() + 60 * 60 * 1000 }, version: 0 }),
    )
  }, user)
}

const readyTextByRoute = {
  '/': 'Review Pulse',
  '/evaluations': 'Review Command Queue',
  '/evaluations/eval-1': 'Annual form requirement readiness',
}

async function capture(page, route, fileName, beforeShot) {
  await mockApi(page)
  await signIn(page)
  await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' })
  const readyText = readyTextByRoute[route]
  if (readyText) await page.getByText(readyText).waitFor({ state: 'visible', timeout: 15_000 })
  if (beforeShot) await beforeShot(page)
  await page.waitForTimeout(1_500)
  await page.screenshot({ path: path.join(outDir, fileName), fullPage: false })
}

await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 })

try {
  await capture(await context.newPage(), '/', 'dashboard.png')
  await capture(await context.newPage(), '/evaluations/eval-1', 'evaluation-form.png')
  await capture(await context.newPage(), '/evaluations', 'export-actions.png', async (page) => {
    await page.getByRole('button', { name: 'Export' }).first().click()
  })

  const docsPage = await context.newPage()
  await docsPage.goto(`${baseURL.replace('5173', '3001')}/api/docs/`, { waitUntil: 'networkidle' })
  await docsPage.screenshot({ path: path.join(outDir, 'swagger-ui.png'), fullPage: false })
} finally {
  await browser.close()
}

console.log(`Captured README screenshots in ${outDir}`)
