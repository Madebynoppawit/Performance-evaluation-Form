import { PrismaClient, EvaluationStatus } from '@prisma/client'

const prisma = new PrismaClient()
const COMPLETED: EvaluationStatus[] = [
  EvaluationStatus.SUBMITTED,
  EvaluationStatus.REVIEWED,
  EvaluationStatus.CLOSED,
]

export async function getSummaryReport() {
  const cycles = await prisma.cycle.findMany({
    include: {
      evaluations: {
        include: {
          evaluatee: { select: { department: true } },
        },
      },
    },
    orderBy: { startDate: 'desc' },
  })

  return cycles.map((cycle) => {
    const total = cycle.evaluations.length
    const completed = cycle.evaluations.filter((e) => COMPLETED.includes(e.status)).length

    const scored = cycle.evaluations.filter((e) => e.totalScore != null)
    const averageScore =
      scored.length > 0
        ? scored.reduce((sum, e) => sum + (e.totalScore ?? 0), 0) / scored.length
        : 0

    const deptMap = new Map<string, number[]>()
    for (const ev of scored) {
      const dept = ev.evaluatee.department ?? 'ไม่ระบุ'
      if (!deptMap.has(dept)) deptMap.set(dept, [])
      deptMap.get(dept)!.push(ev.totalScore!)
    }

    const byDepartment = Array.from(deptMap.entries()).map(([department, scores]) => ({
      department,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))

    return {
      cycleId: cycle.id,
      cycleName: cycle.name,
      averageScore,
      totalEvaluations: total,
      completedEvaluations: completed,
      byDepartment,
    }
  })
}
