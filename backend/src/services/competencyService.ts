import { prisma } from '../lib/prisma'

export async function upsertCompetencyScores(
  evaluationId: string,
  scores: { competencyId: string; score?: number | null; selfScore?: number | null; expectedRating?: number | null }[]
) {
  return Promise.all(
    scores.map((s) =>
      prisma.competencyScore.upsert({
        where: { evaluationId_competencyId: { evaluationId, competencyId: s.competencyId } },
        create: {
          evaluationId,
          competencyId: s.competencyId,
          score: s.score ?? null,
          selfScore: s.selfScore ?? null,
          ...(s.expectedRating != null ? { expectedRating: s.expectedRating } : {}),
        },
        update: {
          score: s.score ?? null,
          selfScore: s.selfScore ?? null,
          ...(s.expectedRating != null ? { expectedRating: s.expectedRating } : {}),
        },
      })
    )
  )
}

export async function getCompetencyScores(evaluationId: string) {
  return prisma.competencyScore.findMany({ where: { evaluationId } })
}

export function calculateCompetencyScore(scores: { score: number | null }[]) {
  const valid = scores.filter((s) => s.score != null)
  if (!valid.length) return null
  return valid.reduce((s, c) => s + c.score!, 0) / valid.length
}
