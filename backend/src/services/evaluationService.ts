import { randomBytes } from 'crypto'
import { prisma } from '../lib/prisma'
import { EvaluationStatus, EvaluationType, FormType, Position } from '@prisma/client'
import { hashPassword } from '../utils/hash'
import { env } from '../config/env'
import * as email from './emailService'

const APP_URL = env.CLIENT_URL.replace(/\/$/, '')

/** Each employee level uses its own appraisal form. */
const POSITION_FORM_TYPE: Record<Position, FormType> = {
  CEO: 'DIRECTOR_LEVEL',
  MANAGING_DIRECTOR: 'DIRECTOR_LEVEL',
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
const EVALUATOR_POSITIONS: Position[] = ['CEO', 'MANAGING_DIRECTOR', 'DIRECTOR_UP', 'MANAGER', 'SUPERVISOR']

function badRequest(message: string) {
  const err = new Error(message) as Error & { status: number }
  err.status = 400
  return err
}

function forbidden(message = 'Forbidden') {
  const err = new Error(message) as Error & { status: number }
  err.status = 403
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
  reviewer:  { select: { id: true, name: true, email: true } },
  answers: true,
}

export async function getEvaluationsForUser(userId: string, role: string) {
  if (role === 'ADMIN' || role === 'DEVELOPER') {
    return prisma.evaluation.findMany({ include: EVALUATION_INCLUDE, orderBy: { updatedAt: 'desc' } })
  }
  // Managers see evaluations they created OR are assigned as reviewer for 2-stage flow.
  if (role === 'MANAGER') {
    return prisma.evaluation.findMany({
      where: { OR: [{ evaluatorId: userId }, { evaluateeId: userId }, { reviewerId: userId }] },
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
  reviewerId?: string
}) {
  const evaluator = await prisma.user.findUniqueOrThrow({ where: { id: data.evaluatorId }, select: { position: true, role: true } })
  // Admin/developer (system accounts without a job position) may always create
  // evaluations; everyone else must hold a supervisory position.
  const privileged = evaluator.role === 'ADMIN' || evaluator.role === 'DEVELOPER'
  if (!privileged && (!evaluator.position || !EVALUATOR_POSITIONS.includes(evaluator.position))) {
    throw badRequest('Evaluator must be a supervisor, manager or director.')
  }

  const evaluatee = data.newEvaluatee
    ? await createEvaluateeUser(data.newEvaluatee)
    : await prisma.user.findUniqueOrThrow({ where: { id: data.evaluateeId! }, select: { id: true, position: true } })

  // Resolve reviewer name for denormalization.
  let reviewerName: string | null = null
  if (data.reviewerId) {
    const rev = await prisma.user.findUnique({ where: { id: data.reviewerId }, select: { name: true } })
    reviewerName = rev?.name ?? null
  }

  const created = await prisma.evaluation.create({
    data: {
      cycleId: data.cycleId,
      evaluatorId: data.evaluatorId,
      evaluatorName: data.evaluatorName?.trim() || null,
      type: data.type,
      evaluateeId: evaluatee.id,
      formType: formTypeForPosition(evaluatee.position),
      reviewerId: data.reviewerId ?? null,
      reviewerName,
    },
    include: EVALUATION_INCLUDE,
  })

  // Notify evaluator that a new evaluation has been assigned to them.
  if (created.evaluator?.email) {
    void email.sendEvaluationAssigned({
      to:            created.evaluator.email,
      evaluatorName: created.evaluator.name ?? 'Evaluator',
      evaluateeName: created.evaluatee?.name ?? 'Employee',
      formType:      created.formType,
      cycleTitle:    created.cycle?.name ?? created.cycleId,
      appUrl:        APP_URL,
      evaluationId:  created.id,
    })
  }

  return created
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
  const nextTotalScore = totalScore ?? evaluation.totalScore

  // If a reviewer is assigned (2-stage workflow), move to PENDING_REVIEW so the
  // reviewer (manager) can do a second-pass before final submission.
  const nextStatus = evaluation.reviewerId
    ? EvaluationStatus.PENDING_REVIEW
    : EvaluationStatus.SUBMITTED

  const updated = await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      status: nextStatus,
      totalScore: nextTotalScore,
      submittedAt: new Date(),
    },
    include: EVALUATION_INCLUDE,
  })

  if (nextStatus === EvaluationStatus.PENDING_REVIEW && updated.reviewer?.email) {
    // 2-stage: notify reviewer (manager) that their review is needed.
    void email.sendPendingReview({
      to:            updated.reviewer.email,
      reviewerName:  updated.reviewer.name ?? 'Reviewer',
      evaluateeName: updated.evaluatee?.name ?? 'Employee',
      evaluatorName: updated.evaluator?.name ?? 'Evaluator',
      appUrl:        APP_URL,
      evaluationId:  updated.id,
    })
  } else if (nextStatus === EvaluationStatus.SUBMITTED && updated.evaluatee?.email) {
    // Direct submit (no reviewer): notify evaluatee their eval is ready to acknowledge.
    void email.sendReadyToAcknowledge({
      to:            updated.evaluatee.email,
      evaluateeName: updated.evaluatee.name ?? 'Employee',
      appUrl:        APP_URL,
      evaluationId:  updated.id,
    })
  }

  return updated
}

/** Manager (reviewer) approves the evaluation after the supervisor's submission.
 *  Moves status from PENDING_REVIEW → SUBMITTED. */
export async function submitReview(
  evaluationId: string,
  actorId: string,
  actorRole: string,
  reviewerComment: string | undefined,
) {
  const evaluation = await prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    select: { status: true, reviewerId: true },
  })
  if (actorRole !== 'DEVELOPER' && evaluation.reviewerId !== actorId) {
    throw forbidden('Only the assigned reviewer can submit this review.')
  }
  if (evaluation.status !== EvaluationStatus.PENDING_REVIEW) {
    throw badRequest('This evaluation is not awaiting review.')
  }

  const updated = await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      status: EvaluationStatus.SUBMITTED,
      reviewerComment: reviewerComment?.trim() || null,
      reviewedAt: new Date(),
    },
    include: EVALUATION_INCLUDE,
  })

  // Notify evaluatee that their evaluation is now submitted and ready to acknowledge.
  if (updated.evaluatee?.email) {
    void email.sendReadyToAcknowledge({
      to:            updated.evaluatee.email,
      evaluateeName: updated.evaluatee.name ?? 'Employee',
      appUrl:        APP_URL,
      evaluationId:  updated.id,
    })
  }

  return updated
}
