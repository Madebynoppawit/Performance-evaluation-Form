import { prisma } from '../lib/prisma'
import { EvaluationStatus } from '@prisma/client'

/**
 * Weighted-average total score across scored rating answers.
 * Returns null when there are no scored rating answers or zero total weight.
 * Pure (no I/O) so it can be unit-tested directly.
 */
export function calculateTotalScore(
  answers: { type: string; score: number | null; weight: number }[]
): number | null {
  const rated = answers.filter(a => a.type === 'rating' && a.score != null)
  const totalWeight = rated.reduce((sum, a) => sum + a.weight, 0)
  if (rated.length === 0 || totalWeight === 0) return null
  return rated.reduce((sum, a) => sum + (a.score ?? 0) * a.weight, 0) / totalWeight
}

const EVALUATION_INCLUDE = {
  cycle: {
    include: {
      template: {
        include: { sections: { include: { questions: { orderBy: { order: 'asc' as const } } }, orderBy: { order: 'asc' as const } } },
      },
    },
  },
  evaluatee: { select: { id: true, name: true, email: true, department: true } },
  evaluator: { select: { id: true, name: true, email: true } },
  answers: true,
}

export async function getEvaluationsForUser(userId: string, role: string) {
  if (role === 'ADMIN') {
    return prisma.evaluation.findMany({ include: EVALUATION_INCLUDE, orderBy: { updatedAt: 'desc' } })
  }
  if (role === 'MANAGER') {
    return prisma.evaluation.findMany({
      where: { OR: [{ evaluatorId: userId }, { evaluateeId: userId }] },
      include: EVALUATION_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    })
  }
  return prisma.evaluation.findMany({
    where: { OR: [{ evaluatorId: userId }, { evaluateeId: userId }] },
    include: EVALUATION_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getEvaluationById(id: string) {
  return prisma.evaluation.findUniqueOrThrow({ where: { id }, include: EVALUATION_INCLUDE })
}

export async function saveAnswers(evaluationId: string, answers: Record<string, string>) {
  const evaluation = await prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: { cycle: { include: { template: { include: { sections: { include: { questions: true } } } } } } },
  })

  const allQuestions = evaluation.cycle.template.sections.flatMap((s) => s.questions)

  await Promise.all(
    Object.entries(answers).map(([questionId, value]) => {
      const question = allQuestions.find((q) => q.id === questionId)
      const score = question?.type === 'rating' ? parseFloat(value) : undefined

      return prisma.answer.upsert({
        where: { evaluationId_questionId: { evaluationId, questionId } },
        create: { evaluationId, questionId, value, score },
        update: { value, score },
      })
    })
  )

  if (evaluation.status === EvaluationStatus.DRAFT) {
    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: { status: EvaluationStatus.IN_PROGRESS },
    })
  }
}

export async function submitEvaluation(evaluationId: string, answers: Record<string, string>) {
  await saveAnswers(evaluationId, answers)

  const evaluation = await prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: { answers: { include: { question: true } } },
  })

  const totalScore = calculateTotalScore(
    evaluation.answers.map(a => ({ type: a.question.type, score: a.score, weight: a.question.weight }))
  )

  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      status: EvaluationStatus.SUBMITTED,
      totalScore,
      submittedAt: new Date(),
    },
    include: EVALUATION_INCLUDE,
  })
}
