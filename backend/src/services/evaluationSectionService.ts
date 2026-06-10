import { prisma } from '../lib/prisma'
import { calculateGoalScore } from './goalService'
import { calculateCompetencyScore } from './competencyService'

type SignerType = 'employee' | 'evaluator' | 'director'
type SectionUser = { userId: string; role: string }
type NullableText = string | null
type Position = 'CEO' | 'DIRECTOR_UP' | 'MANAGER' | 'OFFICER' | 'SUPERVISOR' | 'PRODUCTION_STAFF'

const POSITION_COMPETENCIES: Record<Position, string[]> = {
  CEO: ['CC1', 'CC2', 'CC3', 'CC4', 'MC1', 'MC2', 'TCM1', 'TCM2', 'TCM3', 'TCM4'],
  DIRECTOR_UP: ['CC1', 'CC2', 'CC3', 'CC4', 'MC1', 'MC2', 'TCM1', 'TCM2', 'TCM3', 'TCM4'],
  MANAGER: ['CC1', 'CC2', 'CC3', 'CC4', 'MC1', 'MC2', 'TCM1', 'TCM2', 'TCM3', 'TCM4'],
  // Officer / Supervisor / Production Staff are assessed on the four Core
  // Competencies only — no position-specific technical competencies.
  OFFICER: ['CC1', 'CC2', 'CC3', 'CC4'],
  SUPERVISOR: ['CC1', 'CC2', 'CC3', 'CC4'],
  PRODUCTION_STAFF: ['CC1', 'CC2', 'CC3', 'CC4'],
}

const REQUIRED_TARGET_FIELDS = ['targetRating5', 'targetRating4', 'targetRating3', 'targetRating2', 'targetRating1'] as const

/* The five position-level appraisal forms (Director/Manager/Officer/Supervisor/
   Production) all share the AMW-01-036 skeleton: 6 categories × 3 criteria, a
   flat 1–5 rating with no goal/attendance weighting. They are scored and
   validated identically; only the criterion wording (frontend) differs. */
const APPRAISAL_FORM_TYPES = ['DIRECTOR_LEVEL', 'MANAGER_LEVEL', 'OFFICER_LEVEL', 'SUPERVISOR_LEVEL', 'PRODUCTION_LEVEL']

function isAppraisalForm(formType: string) {
  return APPRAISAL_FORM_TYPES.includes(formType)
}

/* Criterion ids shared by every appraisal form — must stay in sync with the
   category skeleton in frontend formDefinitions.ts. */
const APPRAISAL_CRITERIA = [
  '1.1', '1.2', '1.3',
  '2.1', '2.2', '2.3',
  '3.1', '3.2', '3.3',
  '4.1', '4.2', '4.3',
  '5.1', '5.2', '5.3',
  '6.1', '6.2', '6.3',
]

function forbiddenError() {
  const err = new Error('Forbidden') as Error & { status: number }
  err.status = 403
  return err
}

function submitRequirementError(missing: string[]) {
  const err = new Error('Evaluation does not meet the annual form requirements') as Error & {
    status: number
    details: { missing: string[] }
  }
  err.status = 400
  err.details = { missing }
  return err
}

function hasText(value?: string | null) {
  return !!value?.trim()
}

function hasNumericText(value?: string | null) {
  return value != null && value.trim() !== '' && /^\d+(\.\d+)?$/.test(value.trim())
}

export async function upsertComment(
  evaluationId: string,
  data: { strengths?: NullableText; improvements?: NullableText; requiredSkills?: NullableText }
) {
  return prisma.evaluationComment.upsert({
    where: { evaluationId },
    create: { evaluationId, ...data },
    update: data,
  })
}

export async function upsertSalarySummary(
  evaluationId: string,
  data: {
    oldSalary?: number | null
    newSalary?: number | null
    bonus?: number | null
    bonusDeduction?: number | null
    bonusPolicy?: NullableText
    effectiveDate?: string | null
  }
) {
  const effectiveDate =
    data.effectiveDate === undefined
      ? undefined
      : data.effectiveDate === null
        ? null
        : new Date(data.effectiveDate)

  return prisma.salarySummary.upsert({
    where: { evaluationId },
    create: {
      evaluationId,
      ...data,
      effectiveDate,
    },
    update: {
      ...data,
      effectiveDate,
    },
  })
}

export async function signAcknowledgement(
  evaluationId: string,
  signerType: SignerType,
  user: SectionUser
) {
  const evaluation = await prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    select: { evaluateeId: true, evaluatorId: true },
  })

  const canSign =
    user.role === 'ADMIN' || user.role === 'DEVELOPER' ||
    (signerType === 'employee' && evaluation.evaluateeId === user.userId) ||
    (signerType === 'evaluator' && evaluation.evaluatorId === user.userId)

  if (!canSign) {
    throw forbiddenError()
  }

  const now = new Date()
  const fieldMap = {
    employee: { employeeSignedAt: now },
    evaluator: { evaluatorSignedAt: now },
    director: { directorSignedAt: now },
  }

  return prisma.evaluationAcknowledgement.upsert({
    where: { evaluationId },
    create: { evaluationId, ...fieldMap[signerType] },
    update: fieldMap[signerType],
  })
}

export async function recalculateTotalScore(evaluationId: string) {
  const evaluation = await prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: {
      goalEntries: true,
      competencyScores: true,
      attendanceRecord: true,
    },
  })

  const competencyScore = calculateCompetencyScore(evaluation.competencyScores)

  /* Appraisal forms: a flat appraisal — the total is the average of all rated
     criteria; goal/attendance weighting does not apply. */
  if (isAppraisalForm(evaluation.formType)) {
    return prisma.evaluation.update({
      where: { id: evaluationId },
      data: { goalScore: null, attendanceScore: null, competencyScore, totalScore: competencyScore },
    })
  }

  const goalScore = calculateGoalScore(evaluation.goalEntries)
  const attendanceScore = evaluation.attendanceRecord?.attendanceAvgScore ?? null

  const totalWeight = evaluation.goalWeight + evaluation.competencyWeight + evaluation.attendanceWeight
  let totalScore: number | null = null

  if (goalScore != null && competencyScore != null && attendanceScore != null) {
    totalScore =
      (goalScore * evaluation.goalWeight +
        competencyScore * evaluation.competencyWeight +
        attendanceScore * evaluation.attendanceWeight) /
      totalWeight
  }

  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: { goalScore, competencyScore, attendanceScore, totalScore },
  })
}

export async function upsertEvaluationSummary(
  evaluationId: string,
  data: {
    evaluateeName?: NullableText
    evaluatorName?: NullableText
    evaluationReason?: 'PROBATION' | 'ANNUAL' | 'OTHER' | null
    evaluationReasonOther?: NullableText
    evaluatorTitle?: NullableText
    performanceGrade?: 'EXCELLENT' | 'ABOVE_STANDARD' | 'MEETS_STANDARD' | 'ALMOST_STANDARD' | 'BELOW_STANDARD' | null
    effectiveDate?: string | null
  }
) {
  const effectiveDate =
    data.effectiveDate === undefined ? undefined : data.effectiveDate === null ? null : new Date(data.effectiveDate)

  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      evaluateeName: data.evaluateeName,
      evaluatorName: data.evaluatorName,
      evaluationReason: data.evaluationReason,
      evaluationReasonOther: data.evaluationReasonOther,
      evaluatorTitle: data.evaluatorTitle,
      performanceGrade: data.performanceGrade,
      effectiveDate,
    },
  })
}

export async function assertEvaluationReadyForSubmit(evaluationId: string) {
  const evaluation = await prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: {
      evaluatee: { select: { position: true } },
      goalEntries: true,
      competencyScores: true,
      attendanceRecord: true,
      trainingRecord: true,
      comment: true,
    },
  })

  if (isAppraisalForm(evaluation.formType)) {
    const missing: string[] = []
    const scoredIds = new Set(
      evaluation.competencyScores.filter(score => score.score != null).map(score => score.competencyId)
    )
    const missingCriteria = APPRAISAL_CRITERIA.filter(id => !scoredIds.has(id))
    if (missingCriteria.length) {
      missing.push(`All evaluation criteria must be rated (missing: ${missingCriteria.join(', ')}).`)
    }
    if (!hasText(evaluation.comment?.strengths)) missing.push('Strong point useful to work is required.')
    if (!hasText(evaluation.comment?.improvements)) missing.push('Shortcomings to be rectified is required.')
    if (!hasText(evaluation.comment?.requiredSkills)) missing.push('Knowledge & skill to be improved is required.')
    if (missing.length) throw submitRequirementError(missing)
    return
  }

  const missing: string[] = []
  const goals = evaluation.goalEntries

  if (goals.length === 0) {
    missing.push('Goal Setting requires at least 1 SMART goal.')
  }
  if (goals.length > 5) {
    missing.push('Goal Setting allows no more than 5 goals.')
  }

  const goalWeight = goals.reduce((sum, goal) => sum + goal.weight, 0)
  if (goals.length > 0 && Math.abs(goalWeight - 100) > 0.001) {
    missing.push('Goal Setting total weight must equal 100%.')
  }

  goals.forEach((goal, index) => {
    const label = `Goal ${index + 1}`
    if (!hasText(goal.goal)) missing.push(`${label}: Goal is required.`)
    if (goal.weight <= 0) missing.push(`${label}: Weight must be greater than 0.`)
    if (goal.evaluationScore == null) missing.push(`${label}: Evaluation Score is required.`)
    for (const field of REQUIRED_TARGET_FIELDS) {
      if (!hasNumericText(goal[field])) {
        missing.push(`${label}: Target per rating must be numeric for ratings 5-1.`)
        break
      }
    }
    if (!hasText(goal.wig)) missing.push(`${label}: WIG strategic pillar is required.`)
    if (!hasText(goal.kpiCategory)) missing.push(`${label}: KPI category is required.`)
  })

  const position = evaluation.evaluatee.position
  if (!position) {
    missing.push('Employee position is required for position-based competency.')
  } else {
    const expected = POSITION_COMPETENCIES[position]
    const scoredIds = new Set(evaluation.competencyScores.filter(score => score.score != null).map(score => score.competencyId))
    const missingCompetencies = expected.filter(id => !scoredIds.has(id))
    if (missingCompetencies.length) {
      missing.push(`Competency requires ratings for: ${missingCompetencies.join(', ')}.`)
    }
  }

  if (evaluation.attendanceRecord?.leaveActualDays == null) missing.push('Attendance requires leave actual days.')
  if (evaluation.attendanceRecord?.lateActualTimes == null) missing.push('Attendance requires late actual times.')
  if (!evaluation.attendanceRecord?.disciplinaryLevel) missing.push('Attendance requires disciplinary level.')
  if (evaluation.trainingRecord?.minimumHours == null) missing.push('Training requires minimum hours.')
  if (evaluation.trainingRecord?.actualHours == null) missing.push('Training requires actual hours.')
  if (evaluation.trainingRecord?.score == null) missing.push('Training score could not be calculated.')

  if (!hasText(evaluation.comment?.strengths)) missing.push('Comment requires strengths.')
  if (!hasText(evaluation.comment?.improvements)) missing.push('Comment requires areas for improvement.')
  if (!hasText(evaluation.comment?.requiredSkills)) missing.push('Comment requires required skills.')

  if (missing.length) throw submitRequirementError(missing)
}

export async function getFullEvaluation(evaluationId: string) {
  return prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: {
      cycle: { include: { template: true } },
      evaluatee: { select: { id: true, name: true, email: true, department: true, position: true, hireDate: true, jobTitle: true } },
      evaluator: { select: { id: true, name: true, email: true, position: true, jobTitle: true } },
      goalEntries: { orderBy: { order: 'asc' } },
      competencyScores: true,
      attendanceRecord: true,
      trainingRecord: true,
      comment: true,
      salarySummary: true,
      acknowledgement: true,
    },
  })
}
