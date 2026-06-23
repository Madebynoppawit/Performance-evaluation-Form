import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

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
  goalEntries: [
    {
      id: 'goal-1',
      goal: 'Launch calibrated review governance',
      goalDescription: 'Raise completion quality across business units',
      weight: 60,
      result: 'Completed with executive sign-off',
      evaluationScore: 4.6,
      order: 1,
    },
  ],
  competencyScores: [
    { competencyId: 'leadership', score: 4.4 },
    { competencyId: 'execution', score: 4.3 },
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

const template = {
  id: 'template-1',
  name: 'Executive Review Template',
  description: 'Leadership evaluation template',
  type: 'MANAGER',
  sections: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
}

async function mockApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const method = route.request().method()
    const url = new URL(route.request().url())
    const path = url.pathname.replace(/^\/api/, '')

    if (path === '/dashboard/stats') {
      await route.fulfill({
        json: {
          totalEvaluations: 18,
          completedEvaluations: 14,
          pendingEvaluations: 4,
          averageScore: 4.22,
          totalUsers: 72,
          activeCycles: 2,
        },
      })
      return
    }

    if (path === '/health' || path === '/api/health') {
      await route.fulfill({
        json: {
          status: 'ok',
          version: '0.2.0-rc.1',
          env: 'e2e',
          checkedAt: '2026-06-06T10:00:00.000Z',
          latencyMs: 18,
          requestId: 'e2e-health-request',
          services: { api: 'ok', auth: 'ok', database: 'ok' },
          release: { channel: 'standard', aiEnabled: false, aiProvider: 'none' },
        },
      })
      return
    }

    if (path === '/evaluations') {
      if (method === 'POST') {
        await route.fulfill({ status: 201, json: { ...evaluation, id: 'eval-new', status: 'DRAFT' } })
        return
      }
      await route.fulfill({ json: [evaluation] })
      return
    }

    if (path === '/evaluations/eval-1' && method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' })
      return
    }

    if (path === '/evaluations/eval-1') {
      await route.fulfill({ json: evaluation })
      return
    }

    if (path === '/cycles') {
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          json: {
            ...evaluation.cycle,
            id: 'cycle-new',
            name: 'Annual Review 2027',
            template,
            startDate: '2027-01-01T00:00:00.000Z',
            endDate: '2027-12-31T00:00:00.000Z',
          },
        })
        return
      }
      await route.fulfill({ json: [evaluation.cycle] })
      return
    }

    if (path === '/cycles/cycle-1' && method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' })
      return
    }

    if (path === '/templates') {
      if (method === 'POST') {
        await route.fulfill({ status: 201, json: { ...template, id: 'template-new', name: 'New Template', type: 'SELF' } })
        return
      }
      await route.fulfill({ json: [template] })
      return
    }

    if (path === '/templates/template-1' && method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' })
      return
    }

    if (path === '/templates/template-new' || path === '/templates/template-1') {
      await route.fulfill({ json: path.endsWith('template-new') ? { ...template, id: 'template-new', name: 'New Template', type: 'SELF' } : template })
      return
    }

    if (path === '/users') {
      await route.fulfill({
        json: [
          user,
          evaluation.evaluatee,
          {
            id: 'manager-2',
            email: 'sora@amw-ems.com',
            name: 'Sora Nishida',
            role: 'MANAGER',
            position: 'MANAGER',
            department: 'Manufacturing Excellence',
          },
        ],
      })
      return
    }

    if (path === '/reports/evaluations/eval-1/export') {
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/csv;charset=utf-8',
          'content-disposition': 'attachment; filename="evaluation-eval-1.csv"',
        },
        body: '"Section","Field","Value"\n"Evaluation","ID","eval-1"\n"Scores","Total Score","4.48"\n',
      })
      return
    }

    if (path === '/reports/summary') {
      await route.fulfill({
        json: [{
          cycleId: 'cycle-1',
          cycleName: 'FY2026 Leadership Review',
          averageScore: 4.32,
          totalEvaluations: 18,
          completedEvaluations: 14,
          byDepartment: [
            { department: 'Manufacturing Excellence', averageScore: 4.48 },
            { department: 'People Operations', averageScore: 4.12 },
          ],
        }],
      })
      return
    }

    if (path === '/reports/audit-events') {
      await route.fulfill({
        json: [
          {
            id: 'audit-1',
            eventType: 'evaluation_export_csv',
            actorRole: 'ADMIN',
            requestId: 'req-export-1',
            method: 'GET',
            path: '/api/reports/evaluations/eval-1/export',
            statusCode: 200,
            targetType: 'Evaluation',
            targetId: 'eval-1',
            createdAt: '2026-06-06T10:00:00.000Z',
          },
          {
            id: 'audit-2',
            eventType: 'auth_login_failed',
            actorRole: null,
            requestId: 'req-login-fail',
            method: 'POST',
            path: '/api/auth/login',
            statusCode: 401,
            targetType: null,
            targetId: null,
            createdAt: '2026-06-06T09:50:00.000Z',
          },
        ],
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: `Unhandled E2E route: ${path}` } })
  })
}

async function signIn(page: Page) {
  await page.addInitScript(({ authUser }) => {
    window.localStorage.setItem('theme-mode', 'light')
    window.localStorage.setItem('app-locale', 'en')
    window.sessionStorage.setItem(
      'auth-storage',
      JSON.stringify({ state: { user: authUser, token: 'e2e-token', expiresAt: Date.now() + 60 * 60 * 1000 }, version: 0 }),
    )
  }, { authUser: user })
}

async function openAuthed(page: Page, path: string) {
  await mockApi(page)
  await signIn(page)
  await page.goto(path)
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => Math.ceil(document.documentElement.scrollWidth - window.innerWidth))
  expect(overflow).toBeLessThanOrEqual(4)
}

async function expectNoCriticalA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze()

  expect(results.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
}

test.describe('executive frontend experience', () => {
  test('renders the dashboard cockpit without page overflow', async ({ page }) => {
    await openAuthed(page, '/')

    await expect(page.getByText('Review Pulse')).toBeVisible()
    await expect(page.getByText('Corporate Control')).toBeVisible()
    await expect(page.getByRole('link', { name: 'API Docs OpenAPI' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'FY2026 Leadership Review' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectNoCriticalA11yViolations(page)
  })

  test('exposes API docs in the command palette for admins', async ({ page }) => {
    await openAuthed(page, '/')

    await page.keyboard.press('Control+K')
    await page.getByLabel('Command palette search').fill('swagger')
    await expect(page.getByRole('button', { name: 'API Docs Swagger UI / OpenAPI' })).toBeVisible()
    await expectNoCriticalA11yViolations(page)
  })

  test('opens premium export actions and downloads CSV/PDF reports', async ({ page }) => {
    await openAuthed(page, '/evaluations')

    await expect(page.getByRole('heading', { name: 'Evaluations' })).toBeVisible()
    await expect(page.getByText('Review Command Queue')).toBeVisible()
    await expect(page.getByText('Highest pending concentration')).toBeVisible()
    await page.getByRole('button', { name: 'Export' }).first().click()
    await expect(page.getByText('CSV workbook')).toBeVisible()
    await expect(page.getByText('PDF report EN')).toBeVisible()
    await expect(page.getByText('PDF report FR')).toBeVisible()
    await expectNoCriticalA11yViolations(page)

    const csvDownload = page.waitForEvent('download')
    await page.getByText('CSV workbook').click()
    await expect.poll(async () => (await csvDownload).suggestedFilename()).toBe('evaluation-eval-1.csv')

    await page.getByRole('button', { name: 'Export' }).first().click()
    const pdfDownload = page.waitForEvent('download')
    await page.getByText('PDF report FR').click()
    await expect.poll(async () => (await pdfDownload).suggestedFilename()).toBe('evaluation-Mina Laurent-fr.pdf')
    await expectNoHorizontalOverflow(page)
  })

  test('supports admin add and delete evaluation actions', async ({ page }) => {
    await openAuthed(page, '/evaluations')

    await page.getByRole('button', { name: 'New Evaluation' }).click()
    await expect(page.getByRole('dialog', { name: 'Add evaluation' })).toBeVisible()
    await page.getByPlaceholder('Employee name').fill('Mina Laurent')
    await page.getByPlaceholder('Type evaluator name').fill('K. Somchai Jaidee')
    await page.getByRole('button', { name: 'Add Evaluation', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Add evaluation' })).toBeHidden()

    await page.getByRole('button', { name: 'Delete evaluation for Mina Laurent' }).click()
    await expect(page.getByRole('dialog', { name: 'Delete evaluation' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Delete evaluation' })).toBeHidden()
    await expectNoHorizontalOverflow(page)
  })

  test('supports admin add and delete cycle actions', async ({ page }) => {
    await openAuthed(page, '/cycles')

    await page.getByRole('button', { name: 'Create Cycle' }).click()
    await expect(page.getByRole('dialog', { name: 'Create evaluation cycle' })).toBeVisible()
    await page.getByPlaceholder('e.g. Annual Review 2026').fill('Annual Review 2027')
    await page.getByLabel('Template').selectOption('template-1')
    await page.getByLabel('Start Date').fill('2027-01-01')
    await page.getByLabel('End Date').fill('2027-12-31')
    await page.getByRole('dialog', { name: 'Create evaluation cycle' }).getByRole('button', { name: 'Create Cycle', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Create evaluation cycle' })).toBeHidden()

    await page.getByRole('button', { name: 'Delete cycle FY2026 Leadership Review' }).click()
    await expect(page.getByRole('dialog', { name: 'Delete cycle' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Delete cycle' })).toBeHidden()
    await expectNoHorizontalOverflow(page)
  })

  test('supports admin add and delete template actions', async ({ page }) => {
    await openAuthed(page, '/templates')

    await page.getByRole('button', { name: 'New Template' }).click()
    await expect(page).toHaveURL(/\/templates\/template-new$/)

    await page.goto('/templates')
    await expect(page.getByText('Executive Review Template')).toBeVisible()
    await page.getByRole('button', { name: 'Delete template Executive Review Template' }).click()
    await expect(page.getByRole('dialog', { name: 'Delete template' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Delete template' })).toBeHidden()
    await expectNoHorizontalOverflow(page)
  })

  test('shows admin audit visibility in reports', async ({ page }) => {
    await openAuthed(page, '/reports')

    await expect(page.getByText('Audit Control Center')).toBeVisible()
    await expect(page.getByText('evaluation_export_csv')).toBeVisible()
    await expect(page.getByText('auth_login_failed')).toBeVisible()
    await expect(page.getByText('req-export-1')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectNoCriticalA11yViolations(page)
  })
})

test.describe('keyboard accessibility', () => {
  test('command palette opens with Ctrl+K and closes with Escape', async ({ page }) => {
    await openAuthed(page, '/')
    await page.keyboard.press('Control+K')
    await expect(page.getByLabel('Command palette search')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByLabel('Command palette search')).toBeHidden()
  })

  test('Tab moves focus onto an interactive element', async ({ page }) => {
    await openAuthed(page, '/')
    await page.locator('body').click({ position: { x: 2, y: 2 } })
    await page.keyboard.press('Tab')
    const tag = await page.evaluate(() => document.activeElement?.tagName ?? '')
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(tag)
  })

  test('dialog moves focus inside, wraps at the boundary, and closes on Escape', async ({ page }) => {
    await openAuthed(page, '/evaluations')
    await page.getByRole('button', { name: 'New Evaluation' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add evaluation' })
    await expect(dialog).toBeVisible()

    // Opening the dialog moves focus into it.
    await expect.poll(() => dialog.evaluate((n) => n.contains(document.activeElement))).toBe(true)

    // Shift+Tab from the first focusable wraps back into the dialog (focus trap),
    // rather than escaping to the page behind it.
    await page.keyboard.press('Shift+Tab')
    expect(await dialog.evaluate((n) => n.contains(document.activeElement))).toBe(true)

    // Escape closes the dialog.
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})
