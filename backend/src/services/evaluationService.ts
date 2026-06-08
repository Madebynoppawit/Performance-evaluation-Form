import { prisma } from '../lib/prisma'
import { EvaluationStatus, EvaluationType, FormType, Position } from '@prisma/client'

/** Each employee level uses its own appraisal form. */
const POSITION_FORM_TYPE: Record<Position, FormType> = {
  DIRECTOR_UP: 'DIRECTOR_LEVEL',
  MANAGER: 'MANAGER_LEVEL',
  OFFICER: 'OFFICER_LEVEL',
  SUPERVISOR: 'SUPERVISOR_LEVEL',
  PRODUCTION_STAFF: 'PRODUCTION_LEVEL',
}

function formTypeForPosition(position: Position | null): FormType {
  return position ? POSITION_FORM_TYPE[position] : 'OFFICER_LEVEL'
}

/* The evaluator must be a supervisor / manager / director — the evaluatee can
   be anyone. Kept in sync with the frontend EVALUATOR_POSITIONS list. */
const EVALUATOR_POSITIONS: Position[] = ['DIRECTOR_UP', 'MANAGER', 'SUPERVISOR']

function badRequest(message: string) {
  const err = new Error(message) as Error & { status: number }
  err.status = 400
  return err
}

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

export async function createEvaluation(data: {
  cycleId: string
  evaluateeId: string
  evaluatorId: string
  type: EvaluationType
}) {
  const [evaluatee, evaluator] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: data.evaluateeId }, select: { position: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: data.evaluatorId }, select: { position: true } }),
  ])

  if (!evaluator.position || !EVALUATOR_POSITIONS.includes(evaluator.position)) {
    throw badRequest('Evaluator must be a supervisor, manager or director.')
  }

  return prisma.evaluation.create({
    data: { ...data, formType: formTypeForPosition(evaluatee.position) },
    include: EVALUATION_INCLUDE,
  })
}

export async function deleteEvaluation(id: string) {
  return prisma.evaluation.delete({ where: { id } })
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
