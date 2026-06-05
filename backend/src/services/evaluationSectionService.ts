import { prisma } from '../lib/prisma'
import { calculateGoalScore } from './goalService'
import { calculateCompetencyScore } from './competencyService'

type SignerType = 'employee' | 'evaluator' | 'director'
type SectionUser = { userId: string; role: string }
type NullableText = string | null

function forbiddenError() {
  const err = new Error('Forbidden') as Error & { status: number }
  err.status = 403
  return err
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
    user.role === 'ADMIN' ||
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

  const goalScore = calculateGoalScore(evaluation.goalEntries)
  const competencyScore = calculateCompetencyScore(evaluation.competencyScores)
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

export async function getFullEvaluation(evaluationId: string) {
  return prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: {
      cycle: { include: { template: true } },
      evaluatee: { select: { id: true, name: true, email: true, department: true, position: true } },
      evaluator: { select: { id: true, name: true, email: true, position: true } },
      goalEntries: { orderBy: { order: 'asc' } },
      competencyScores: true,
      attendanceRecord: true,
      comment: true,
      salarySummary: true,
      acknowledgement: true,
    },
  })
}
