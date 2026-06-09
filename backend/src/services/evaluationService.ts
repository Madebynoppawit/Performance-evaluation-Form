import { randomBytes } from 'crypto'
import { prisma } from '../lib/prisma'
import { EvaluationStatus, EvaluationType, FormType, Position } from '@prisma/client'
import { hashPassword } from '../utils/hash'
import { env } from '../config/env'

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
  evaluatee: { select: { id: true, name: true, email: true, department: true, position: true, jobTitle: true } },
  evaluator: { select: { id: true, name: true, email: true } },
  answers: true,
}

export async function getEvaluationsForUser(userId: string, role: string) {
  if (role === 'ADMIN' || role === 'DEVELOPER') {
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

/* Create a lightweight employee record for an inline-added evaluatee. The
   person is a real User (role EMPLOYEE) with an auto-allocated company email
   and a random password — enough to be referenced and re-used as an evaluatee;
   they are not expected to log in until an admin sets their credentials. */
async function createEvaluateeUser(input: { name: string; position: Position; department?: string; jobTitle?: string }) {
  const domain = env.COMPANY_EMAIL_DOMAIN.toLowerCase()
  let email = ''
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `emp.${randomBytes(4).toString('hex')}@${domain}`
    const exists = await prisma.user.findUnique({ where: { email: candidate }, select: { id: true } })
    if (!exists) { email = candidate; break }
  }
  if (!email) throw badRequest('Could not allocate an employee email — please try again.')

  const password = await hashPassword(randomBytes(12).toString('hex'))
  return prisma.user.create({
    data: { email, name: input.name, password, role: 'EMPLOYEE', position: input.position, department: input.department, jobTitle: input.jobTitle },
    select: { id: true, position: true },
  })
}

export async function createEvaluation(data: {
  cycleId: string
  evaluatorId: string
  evaluatorName?: string
  type: EvaluationType
  evaluateeId?: string
  newEvaluatee?: { name: string; position: Position; department?: string; jobTitle?: string }
}) {
  const evaluator = await prisma.user.findUniqueOrThrow({ where: { id: data.evaluatorId }, select: { position: true } })
  if (!evaluator.position || !EVALUATOR_POSITIONS.includes(evaluator.position)) {
    throw badRequest('Evaluator must be a supervisor, manager or director.')
  }

  const evaluatee = data.newEvaluatee
    ? await createEvaluateeUser(data.newEvaluatee)
    : await prisma.user.findUniqueOrThrow({ where: { id: data.evaluateeId! }, select: { id: true, position: true } })

  return prisma.evaluation.create({
    data: {
      cycleId: data.cycleId,
      evaluatorId: data.evaluatorId,
      evaluatorName: data.evaluatorName?.trim() || null,
      type: data.type,
      evaluateeId: evaluatee.id,
      formType: formTypeForPosition(evaluatee.position),
    },
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
