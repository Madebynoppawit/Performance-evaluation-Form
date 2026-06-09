import { prisma } from '../lib/prisma'
import { EvaluationStatus } from '@prisma/client'
import { canAccessEvaluation } from '../middleware/auth'
const COMPLETED: EvaluationStatus[] = [
  EvaluationStatus.SUBMITTED,
  EvaluationStatus.REVIEWED,
  EvaluationStatus.CLOSED,
]

export async function getSummaryReport() {
  const cycles = await prisma.cycle.findMany({
    include: {
      evaluations: {
        include: {
          evaluatee: { select: { department: true } },
        },
      },
    },
    orderBy: { startDate: 'desc' },
  })

  return cycles.map((cycle) => {
    const total = cycle.evaluations.length
    const completed = cycle.evaluations.filter((e) => COMPLETED.includes(e.status)).length

    const scored = cycle.evaluations.filter((e) => e.totalScore != null)
    const averageScore =
      scored.length > 0
        ? scored.reduce((sum, e) => sum + (e.totalScore ?? 0), 0) / scored.length
        : 0

    const deptMap = new Map<string, number[]>()
    for (const ev of scored) {
      const dept = ev.evaluatee.department ?? 'ไม่ระบุ'
      if (!deptMap.has(dept)) deptMap.set(dept, [])
      deptMap.get(dept)!.push(ev.totalScore!)
    }

    const byDepartment = Array.from(deptMap.entries()).map(([department, scores]) => ({
      department,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))

    return {
      cycleId: cycle.id,
      cycleName: cycle.name,
      averageScore,
      totalEvaluations: total,
      completedEvaluations: completed,
      byDepartment,
    }
  })
}

export async function getAuditEvents() {
  return prisma.auditEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      eventType: true,
      actorId: true,
      actorRole: true,
      requestId: true,
      method: true,
      path: true,
      statusCode: true,
      targetType: true,
      targetId: true,
      metadata: true,
      ip: true,
      userAgent: true,
      createdAt: true,
    },
  })
}

function csvCell(value: unknown) {
  if (value == null || value === '') return ''
  const text = value instanceof Date ? value.toISOString() : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function csvRow(...cells: unknown[]) {
  return cells.map(csvCell).join(',')
}

function csvBlank() {
  return ''
}

function csvSection(title: string) {
  return csvRow(title.toUpperCase())
}

function dateCell(value?: Date | string | null) {
  if (!value) return ''
  return new Date(value).toISOString()
}

export async function exportEvaluationCsv(
  evaluationId: string,
  user: { userId: string; role: string }
) {
  const evaluation = await prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: {
      cycle: true,
      evaluatee: { select: { id: true, name: true, email: true, department: true, position: true } },
      evaluator: { select: { id: true, name: true, email: true, position: true } },
      goalEntries: { orderBy: { order: 'asc' } },
      competencyScores: true,
      attendanceRecord: true,
      trainingRecord: true,
      comment: true,
      salarySummary: true,
      acknowledgement: true,
    },
  })

  if (!canAccessEvaluation(user, evaluation)) {
    const err = new Error('Forbidden') as Error & { status: number }
    err.status = 403
    throw err
  }

  const includeSalary = user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'DEVELOPER'
  const exportedAt = new Date().toISOString()
  const rows = [
    csvRow('AMW PERFORMANCE EVALUATION EXPORT'),
    csvRow('Generated At', exportedAt),
    csvRow('Confidentiality', 'Internal HR record - handle under company data policy'),
    csvRow('Export Scope', includeSalary ? 'Full management export' : 'Employee-safe export'),
    csvBlank(),
    csvSection('Key Facts'),
    csvRow('Section', 'Field', 'Value'),
    csvRow('Evaluation', 'ID', evaluation.id),
    csvRow('Evaluation', 'Cycle', evaluation.cycle.name),
    csvRow('Evaluation', 'Type', evaluation.type),
    csvRow('Evaluation', 'Status', evaluation.status),
    csvRow('Evaluation', 'Submitted At', dateCell(evaluation.submittedAt)),
    csvRow('Employee', 'Name', evaluation.evaluatee.name),
    csvRow('Employee', 'Email', evaluation.evaluatee.email),
    csvRow('Employee', 'Department', evaluation.evaluatee.department),
    csvRow('Employee', 'Position', evaluation.evaluatee.position),
    csvRow('Evaluator', 'Name', evaluation.evaluator.name),
    csvRow('Evaluator', 'Email', evaluation.evaluator.email),
    csvBlank(),
    csvSection('Score Summary'),
    csvRow('Component', 'Weight', 'Score'),
    csvRow('Scores', 'Goal Weight', evaluation.goalWeight),
    csvRow('Scores', 'Goal Score', evaluation.goalScore),
    csvRow('Scores', 'Competency Weight', evaluation.competencyWeight),
    csvRow('Scores', 'Competency Score', evaluation.competencyScore),
    csvRow('Scores', 'Attendance Weight', evaluation.attendanceWeight),
    csvRow('Scores', 'Attendance Score', evaluation.attendanceScore),
    csvRow('Scores', 'Total Score', evaluation.totalScore),
  ]

  for (const goal of evaluation.goalEntries) {
    if (goal.order === evaluation.goalEntries[0]?.order) {
      rows.push(csvBlank(), csvSection('Goals'), csvRow('Goal', 'Field', 'Value'))
    }
    rows.push(csvRow('Goal', `Goal ${goal.order}`, goal.goal))
    rows.push(csvRow('Goal', `Goal ${goal.order} WIG`, goal.wig))
    rows.push(csvRow('Goal', `Goal ${goal.order} KPI Category`, goal.kpiCategory))
    rows.push(csvRow('Goal', `Goal ${goal.order} Weight`, goal.weight))
    rows.push(csvRow('Goal', `Goal ${goal.order} Result`, goal.result))
    rows.push(csvRow('Goal', `Goal ${goal.order} Score`, goal.evaluationScore))
    rows.push(csvRow('Goal', `Goal ${goal.order} Employee Comment`, goal.employeeComment))
    rows.push(csvRow('Goal', `Goal ${goal.order} Superior Comment`, goal.superiorComment))
  }

  for (const score of evaluation.competencyScores) {
    if (score === evaluation.competencyScores[0]) {
      rows.push(csvBlank(), csvSection('Competency'), csvRow('Competency ID', 'Score'))
    }
    rows.push(csvRow('Competency', score.competencyId, score.score))
  }

  if (evaluation.attendanceRecord) {
    rows.push(csvBlank(), csvSection('Attendance'), csvRow('Metric', 'Value'))
    rows.push(csvRow('Attendance', 'Leave Actual Days', evaluation.attendanceRecord.leaveActualDays))
    rows.push(csvRow('Attendance', 'Late Actual Times', evaluation.attendanceRecord.lateActualTimes))
    rows.push(csvRow('Attendance', 'Disciplinary Level', evaluation.attendanceRecord.disciplinaryLevel))
    rows.push(csvRow('Attendance', 'Leave Score', evaluation.attendanceRecord.leaveScore))
    rows.push(csvRow('Attendance', 'Late Score', evaluation.attendanceRecord.lateScore))
    rows.push(csvRow('Attendance', 'Disciplinary Score', evaluation.attendanceRecord.disciplinaryScore))
  }

  if (evaluation.trainingRecord) {
    rows.push(csvBlank(), csvSection('Training'), csvRow('Metric', 'Value'))
    rows.push(csvRow('Training', 'Minimum Hours', evaluation.trainingRecord.minimumHours))
    rows.push(csvRow('Training', 'Actual Hours', evaluation.trainingRecord.actualHours))
    rows.push(csvRow('Training', '% vs Minimum', evaluation.trainingRecord.percentOfMinimum))
    rows.push(csvRow('Training', 'Score', evaluation.trainingRecord.score))
    rows.push(csvRow('Training', 'Behavior Note', evaluation.trainingRecord.behaviorNote))
  }

  if (evaluation.comment) {
    rows.push(csvBlank(), csvSection('Manager Comments'), csvRow('Field', 'Value'))
    rows.push(csvRow('Comment', 'Strengths', evaluation.comment.strengths))
    rows.push(csvRow('Comment', 'Improvements', evaluation.comment.improvements))
    rows.push(csvRow('Comment', 'Required Skills', evaluation.comment.requiredSkills))
  }

  if (includeSalary && evaluation.salarySummary) {
    rows.push(csvBlank(), csvSection('Salary & Bonus'), csvRow('Field', 'Value'))
    rows.push(csvRow('Salary', 'Old Salary', evaluation.salarySummary.oldSalary))
    rows.push(csvRow('Salary', 'New Salary', evaluation.salarySummary.newSalary))
    rows.push(csvRow('Salary', 'Bonus', evaluation.salarySummary.bonus))
    rows.push(csvRow('Salary', 'Bonus Deduction', evaluation.salarySummary.bonusDeduction))
    rows.push(csvRow('Salary', 'Bonus Policy', evaluation.salarySummary.bonusPolicy))
    rows.push(csvRow('Salary', 'Effective Date', dateCell(evaluation.salarySummary.effectiveDate)))
  }

  if (evaluation.acknowledgement) {
    rows.push(csvBlank(), csvSection('Acknowledgement'), csvRow('Signer', 'Signed At'))
    rows.push(csvRow('Acknowledgement', 'Employee Signed At', dateCell(evaluation.acknowledgement.employeeSignedAt)))
    rows.push(csvRow('Acknowledgement', 'Evaluator Signed At', dateCell(evaluation.acknowledgement.evaluatorSignedAt)))
    rows.push(csvRow('Acknowledgement', 'Director Signed At', dateCell(evaluation.acknowledgement.directorSignedAt)))
  }

  const safeName = evaluation.evaluatee.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'evaluation'
  return {
    filename: `evaluation-${safeName}-${evaluation.id}.csv`,
    csv: `\uFEFF${rows.join('\n')}\n`,
    scope: includeSalary ? 'management' : 'employee',
  }
}
