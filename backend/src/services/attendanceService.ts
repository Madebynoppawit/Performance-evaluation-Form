import { prisma } from '../lib/prisma'

function calcLeaveScore(days: number): number {
  if (days === 0) return 5
  if (days <= 2) return 4
  if (days <= 4) return 3
  if (days <= 6) return 2
  return 1
}

function calcLateScore(times: number): number {
  if (times <= 3) return 5
  if (times <= 5) return 4
  if (times <= 7) return 3
  if (times <= 9) return 2
  return 1
}

function calcDisciplinaryScore(level: string): number {
  if (level === 'NONE') return 5
  if (level === 'VERBAL_WARNING_1') return 2
  if (level === 'WRITTEN_WARNING_1') return 2
  return 1
}

export function calculateAttendanceScores(data: {
  leaveActualDays?: number | null
  lateActualTimes?: number | null
  disciplinaryLevel?: string | null
}) {
  const leaveScore = data.leaveActualDays != null ? calcLeaveScore(data.leaveActualDays) : undefined
  const lateScore = data.lateActualTimes != null ? calcLateScore(data.lateActualTimes) : undefined
  const disciplinaryScore =
    data.disciplinaryLevel != null ? calcDisciplinaryScore(data.disciplinaryLevel) : undefined

  const scores = [leaveScore, lateScore, disciplinaryScore].filter((s) => s != null) as number[]
  const attendanceAvgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined

  return { leaveScore, lateScore, disciplinaryScore, attendanceAvgScore }
}

export async function upsertAttendanceScore(
  evaluationId: string,
  data: {
    leaveActualDays?: number | null
    lateActualTimes?: number | null
    disciplinaryLevel?: string | null
  }
) {
  const { leaveScore, lateScore, disciplinaryScore, attendanceAvgScore } = calculateAttendanceScores(data)

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
