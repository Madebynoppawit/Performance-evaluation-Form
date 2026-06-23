import { prisma } from '../lib/prisma'
import { calculateGoalScore } from './goalService'
import { calculateCompetencyScore } from './competencyService'
import * as email from './emailService'
import { env } from '../config/env'

const APP_URL = env.CLIENT_URL.replace(/\/$/, '')

type SignerType = 'employee' | 'evaluator' | 'director'
type SectionUser = { userId: string; role: string }
type NullableText = string | null
type Position = 'CEO' | 'MANAGING_DIRECTOR' | 'DIRECTOR_UP' | 'MANAGER' | 'OFFICER' | 'SUPERVISOR' | 'PRODUCTION_STAFF' | 'OTHER'

const POSITION_COMPETENCIES: Record<Position, string[]> = {
  CEO: ['CC1', 'CC2', 'CC3', 'CC4', 'MC1', 'MC2', 'TCM1', 'TCM2', 'TCM3', 'TCM4'],
  MANAGING_DIRECTOR: ['CC1', 'CC2', 'CC3', 'CC4', 'MC1', 'MC2', 'TCM1', 'TCM2', 'TCM3', 'TCM4'],
  DIRECTOR_UP: ['CC1', 'CC2', 'CC3', 'CC4', 'MC1', 'MC2', 'TCM1', 'TCM2', 'TCM3', 'TCM4'],
  MANAGER: ['CC1', 'CC2', 'CC3', 'CC4', 'MC1', 'MC2', 'TCM1', 'TCM2', 'TCM3', 'TCM4'],
  // Officer / Supervisor / Production Staff are assessed on the four Core
  // Competencies only — no position-specific technical competencies.
  OFFICER: ['CC1', 'CC2', 'CC3', 'CC4'],
  SUPERVISOR: ['CC1', 'CC2', 'CC3', 'CC4'],
  PRODUCTION_STAFF: ['CC1', 'CC2', 'CC3', 'CC4'],
  OTHER: ['CC1', 'CC2', 'CC3', 'CC4'],
}

const REQUIRED_TARGET_FIELDS = ['targetRating5', 'targetRating4', 'targetRating3', 'targetRating2', 'targetRating1'] as const

/* Director / Manager / Officer use the appraisal form (6 categories × 3
   criteria, 1–5 rating). Its "Evaluation" section is the competency bucket.
   All forms use the weighted scoring model:
   Goal(60-70%) + Competency(20%) + Attendance(10%) + Training(0-10%) = 100%. */
const APPRAISAL_FORM_TYPES = ['DIRECTOR_LEVEL', 'MANAGER_LEVEL', 'OFFICER_LEVEL']

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

export async function saveAcknowledgementManual(
  evaluationId: string,
  data: {
    employeeSignedAt?: string | null
    evaluatorSignedAt?: string | null
    directorSignedAt?: string | null
  }
) {
  const toDate = (v: string | null | undefined) => (v ? new Date(v) : null)
  const payload: Record<string, Date | null> = {}
  if ('employeeSignedAt' in data) payload.employeeSignedAt = toDate(data.employeeSignedAt)
  if ('evaluatorSignedAt' in data) payload.evaluatorSignedAt = toDate(data.evaluatorSignedAt)
  if ('directorSignedAt' in data) payload.directorSignedAt = toDate(data.directorSignedAt)

  // Check if employee was previously unsigned (to avoid duplicate emails on re-save).
  const existing = await prisma.evaluationAcknowledgement.findUnique({
    where: { evaluationId },
    select: { employeeSignedAt: true },
  })
  const employeeJustSigned = 'employeeSignedAt' in data &&
    data.employeeSignedAt != null &&
    existing?.employeeSignedAt == null

  const result = await prisma.evaluationAcknowledgement.upsert({
    where: { evaluationId },
    create: { evaluationId, ...payload },
    update: payload,
  })

  if (employeeJustSigned) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: {
        evaluator: { select: { email: true, name: true } },
        evaluatee: { select: { name: true } },
      },
    })
    if (evaluation?.evaluator?.email) {
      void email.sendAcknowledged({
        to:            evaluation.evaluator.email,
        evaluatorName: evaluation.evaluator.name ?? 'Evaluator',
        evaluateeName: evaluation.evaluatee?.name ?? 'Employee',
        appUrl:        APP_URL,
        evaluationId,
      })
    }
  }

  return result
}

export async function recalculateTotalScore(evaluationId: string) {
  const evaluation = await prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: {
      goalEntries: true,
      competencyScores: true,
      attendanceRecord: true,
      trainingRecord: true,
    },
  })

  const competencyScore = calculateCompetencyScore(evaluation.competencyScores)

  const goalScore = calculateGoalScore(evaluation.goalEntries)
  const attendanceScore = evaluation.attendanceRecord?.attendanceAvgScore ?? null
  const trainingScore = evaluation.trainingRecord?.score ?? null

  // Training takes its configured weight when a training score exists; goal absorbs the rest.
  // Formula: Goal + Competency + Attendance + Training = 100% (weights inherited from the template)
  const effectiveTrainingWeight = trainingScore != null ? evaluation.trainingWeight : 0
  const effectiveGoalWeight = 100 - evaluation.competencyWeight - evaluation.attendanceWeight - effectiveTrainingWeight

  // A bucket is only required when it actually carries weight.
  const needs = (weight: number, value: number | null) => weight <= 0 || value != null

  /* Appraisal forms: the "Evaluation" section (6 categories, criterion ids
     1.1–6.3) is the weighted competency bucket; position competencies (CCx) are
     captured for reference but excluded from the weighted total. Goal /
     Attendance / Training weighting applies as in the standard model. */
  if (isAppraisalForm(evaluation.formType)) {
    const evaluationScore = calculateCompetencyScore(
      evaluation.competencyScores.filter((s) => APPRAISAL_CRITERIA.includes(s.competencyId))
    )

    const present = needs(effectiveGoalWeight, goalScore)
      && needs(evaluation.competencyWeight, evaluationScore)
      && needs(evaluation.attendanceWeight, attendanceScore)
      && needs(effectiveTrainingWeight, trainingScore)

    const totalScore = present
      ? (
          (goalScore ?? 0) * effectiveGoalWeight +
          (evaluationScore ?? 0) * evaluation.competencyWeight +
          (attendanceScore ?? 0) * evaluation.attendanceWeight +
          (trainingScore ?? 0) * effectiveTrainingWeight
        ) / 100
      : null

    return prisma.evaluation.update({
      where: { id: evaluationId },
      data: { goalScore, competencyScore: evaluationScore, attendanceScore, totalScore },
    })
  }

  let totalScore: number | null = null
  if (goalScore != null && competencyScore != null && attendanceScore != null) {
    totalScore = (
      goalScore * effectiveGoalWeight +
      competencyScore * evaluation.competencyWeight +
      attendanceScore * evaluation.attendanceWeight +
      (trainingScore ?? 0) * effectiveTrainingWeight
    ) / 100
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

/** Calibration-only update: set the final performance grade without touching
 * evaluation content. Used by the admin/HR calibration workspace. */
export async function setPerformanceGrade(
  evaluationId: string,
  performanceGrade: 'EXCELLENT' | 'ABOVE_STANDARD' | 'MEETS_STANDARD' | 'ALMOST_STANDARD' | 'BELOW_STANDARD',
) {
  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: { performanceGrade },
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
  const totalGoalWeight = goals.reduce((s, g) => s + g.weight, 0)
  if (totalGoalWeight > 70) {
    missing.push(`Total goal weight (${totalGoalWeight}%) must not exceed 70%.`)
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
  // Training is optional — if hours are entered the score must be calculable, but it's OK to skip.
  if (evaluation.trainingRecord?.actualHours != null && evaluation.trainingRecord?.score == null) {
    missing.push('Training score could not be calculated — check minimum hours.')
  }

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
      evaluatee: { select: { id: true, name: true, email: true, department: true, position: true, hireDate: true, jobTitle: true, jobGrade: true, division: true, buGroup: true, employeeNo: true } },
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
