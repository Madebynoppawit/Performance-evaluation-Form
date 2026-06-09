import { prisma } from '../lib/prisma'
import { EvaluationStatus, CycleStatus } from '@prisma/client'

const COMPLETED: EvaluationStatus[] = [
  EvaluationStatus.SUBMITTED,
  EvaluationStatus.REVIEWED,
  EvaluationStatus.CLOSED,
]

export async function getDashboardStats(userId: string, role: string) {
  const isPrivileged = role === 'ADMIN' || role === 'DEVELOPER'
  const [evaluations, totalUsers, activeCycles] = await Promise.all([
    isPrivileged
      ? prisma.evaluation.findMany({ include: { evaluatee: { select: { department: true } } } })
      : prisma.evaluation.findMany({
          where: { OR: [{ evaluatorId: userId }, { evaluateeId: userId }] },
        }),
    isPrivileged ? prisma.user.count() : undefined,
    prisma.cycle.count({ where: { status: CycleStatus.ACTIVE } }),
  ])

  const completed = evaluations.filter(e => COMPLETED.includes(e.status))
  const scored = evaluations.filter(e => e.totalScore != null)
  const averageScore = scored.length
    ? scored.reduce((s, e) => s + e.totalScore!, 0) / scored.length
    : null

  return {
    totalEvaluations:     evaluations.length,
    completedEvaluations: completed.length,
    pendingEvaluations:   evaluations.length - completed.length,
    averageScore,
    totalUsers:    totalUsers ?? null,
    activeCycles,
  }
}
