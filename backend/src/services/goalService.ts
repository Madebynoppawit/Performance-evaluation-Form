import { prisma } from '../lib/prisma'

export interface GoalEntryInput {
  id?: string
  goal: string
  goalDescription?: string | null
  weight: number
  targetRating5?: string | null
  targetRating4?: string | null
  targetRating3?: string | null
  targetRating2?: string | null
  targetRating1?: string | null
  result?: string | null
  evaluationScore?: number | null
  employeeComment?: string | null
  superiorComment?: string | null
  order?: number
}

export async function upsertGoalEntries(evaluationId: string, entries: GoalEntryInput[]) {
  if (entries.length > 5) throw new Error('กำหนด Goal ได้ไม่เกิน 5 หัวข้อ')

  await prisma.goalEntry.deleteMany({ where: { evaluationId } })

  return prisma.goalEntry.createMany({
    data: entries.map((e, i) => ({ ...e, evaluationId, order: i + 1 })),
  })
}

export async function getGoalEntries(evaluationId: string) {
  return prisma.goalEntry.findMany({
    where: { evaluationId },
    orderBy: { order: 'asc' },
  })
}

export function calculateGoalScore(entries: { weight: number; evaluationScore: number | null }[]) {
  const scored = entries.filter((e) => e.evaluationScore != null)
  if (!scored.length) return null
  const totalWeight = scored.reduce((s, e) => s + e.weight, 0)
  if (totalWeight === 0) return null
  return scored.reduce((s, e) => s + (e.evaluationScore! * e.weight), 0) / totalWeight
}
