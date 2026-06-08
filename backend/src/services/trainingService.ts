import { prisma } from '../lib/prisma'

type TrainingInput = {
  minimumHours?: number | null
  actualHours?: number | null
  behaviorNote?: string | null
}

export function calculateTrainingScore(data: TrainingInput) {
  const minimumHours = data.minimumHours ?? null
  const actualHours = data.actualHours ?? null

  if (minimumHours == null || actualHours == null || minimumHours <= 0) {
    return {
      minimumHours,
      actualHours,
      percentOfMinimum: null,
      score: null,
      behaviorNote: data.behaviorNote ?? null,
    }
  }

  const percentOfMinimum = (actualHours / minimumHours) * 100
  let score = 1
  if (percentOfMinimum >= 130) score = 5
  else if (percentOfMinimum >= 110) score = 4
  else if (percentOfMinimum >= 100) score = 3
  else if (percentOfMinimum >= 70) score = 2

  return {
    minimumHours,
    actualHours,
    percentOfMinimum,
    score,
    behaviorNote: data.behaviorNote ?? null,
  }
}

export async function upsertTrainingScore(evaluationId: string, data: TrainingInput) {
  const payload = calculateTrainingScore(data)
  return prisma.trainingScore.upsert({
    where: { evaluationId },
    create: { evaluationId, ...payload },
    update: payload,
  })
}
