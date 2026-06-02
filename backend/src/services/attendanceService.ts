import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function calcLeaveScore(days: number): number {
  if (days === 0) return 5
  if (days <= 2) return 4
  if (days <= 4) return 3
  if (days <= 6) return 2
  return 1
}

function calcLateScore(times: number): number {
  if (times <= 6) return 5
  if (times <= 8) return 4
  if (times <= 10) return 3
  if (times <= 12) return 2
  return 1
}

function calcDisciplinaryScore(level: string): number {
  if (level === 'NONE') return 5
  if (level === 'VERBAL_WARNING_1') return 2
  if (level === 'WRITTEN_WARNING_1') return 2
  return 1
}

export async function upsertAttendanceScore(
  evaluationId: string,
  data: {
    leaveActualDays?: number
    lateActualTimes?: number
    disciplinaryLevel?: string
  }
) {
  const leaveScore = data.leaveActualDays != null ? calcLeaveScore(data.leaveActualDays) : undefined
  const lateScore = data.lateActualTimes != null ? calcLateScore(data.lateActualTimes) : undefined
  const disciplinaryScore =
    data.disciplinaryLevel != null ? calcDisciplinaryScore(data.disciplinaryLevel) : undefined

  const scores = [leaveScore, lateScore, disciplinaryScore].filter((s) => s != null) as number[]
  const attendanceAvgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined

  return prisma.attendanceScore.upsert({
    where: { evaluationId },
    create: {
      evaluationId,
      leaveActualDays: data.leaveActualDays,
      lateActualTimes: data.lateActualTimes,
      disciplinaryLevel: data.disciplinaryLevel,
      leaveScore,
      lateScore,
      disciplinaryScore,
      attendanceAvgScore,
    },
    update: {
      leaveActualDays: data.leaveActualDays,
      lateActualTimes: data.lateActualTimes,
      disciplinaryLevel: data.disciplinaryLevel,
      leaveScore,
      lateScore,
      disciplinaryScore,
      attendanceAvgScore,
    },
  })
}

export async function getAttendanceScore(evaluationId: string) {
  return prisma.attendanceScore.findUnique({ where: { evaluationId } })
}
