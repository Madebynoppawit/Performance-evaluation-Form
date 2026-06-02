import { PrismaClient, EvaluationStatus } from '@prisma/client'

const prisma = new PrismaClient()

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

  const ratingAnswers = evaluation.answers.filter((a) => a.question.type === 'rating' && a.score != null)
  const totalScore =
    ratingAnswers.length > 0
      ? ratingAnswers.reduce((sum, a) => sum + (a.score ?? 0) * a.question.weight, 0) /
        ratingAnswers.reduce((sum, a) => sum + a.question.weight, 0)
      : null

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
