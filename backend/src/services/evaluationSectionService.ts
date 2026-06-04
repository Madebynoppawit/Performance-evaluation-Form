import { prisma } from '../lib/prisma'
import { calculateGoalScore } from './goalService'
import { calculateCompetencyScore } from './competencyService'

export async function upsertComment(
  evaluationId: string,
  data: { strengths?: string; improvements?: string; requiredSkills?: string }
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
    oldSalary?: number
    newSalary?: number
    bonus?: number
    bonusDeduction?: number
    bonusPolicy?: string
    effectiveDate?: string
  }
) {
  return prisma.salarySummary.upsert({
    where: { evaluationId },
    create: {
      evaluationId,
      ...data,
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
    },
    update: {
      ...data,
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
    },
  })
}

export async function signAcknowledgement(
  evaluationId: string,
  signerType: 'employee' | 'evaluator' | 'director'
) {
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
