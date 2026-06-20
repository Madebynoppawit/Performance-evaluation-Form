import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import * as goalService from '../services/goalService'
import * as competencyService from '../services/competencyService'
import * as attendanceService from '../services/attendanceService'
import * as trainingService from '../services/trainingService'
import * as sectionService from '../services/evaluationSectionService'

const nullableText = z.string().trim().max(2000).nullable().optional()
const nullableGoalText = z.string()
  .trim()
  .max(100)
  .nullable()
  .optional()

const goalsSchema = z.object({
  goals: z.array(z.object({
    id: z.string().min(1).optional(),
    goal: z.string().trim().min(1).max(500),
    goalDescription: nullableText,
    weight: z.number().min(0).max(100),
    targetRating5: nullableGoalText,
    targetRating4: nullableGoalText,
    targetRating3: nullableGoalText,
    targetRating2: nullableGoalText,
    targetRating1: nullableGoalText,
    wig: z.string().trim().max(100).nullable().optional(),
    kpiCategory: z.string().trim().max(200).nullable().optional(),
    result: nullableText,
    evaluationScore: z.number().int().min(1).max(5).nullable().optional(),
    employeeComment: nullableText,
    superiorComment: nullableText,
    order: z.number().int().positive().optional(),
  })).max(5).default([]),
})

const competencySchema = z.object({
  scores: z.array(z.object({
    competencyId: z.string().min(1),
    score: z.number().int().min(1).max(5).nullable().optional(),
  })).default([]),
})

const attendanceSchema = z.object({
  leaveActualDays: z.number().int().min(0).nullable().optional(),
  lateActualTimes: z.number().int().min(0).nullable().optional(),
  disciplinaryLevel: z.enum([
    'NONE',
    'VERBAL_WARNING_1',
    'WRITTEN_WARNING_1',
    'MULTIPLE_WARNING_OR_SUSPENSION',
  ]).nullable().optional(),
})

const trainingSchema = z.object({
  minimumHours: z.number().min(0).nullable().optional(),
  actualHours: z.number().min(0).nullable().optional(),
  behaviorNote: nullableText,
})

const commentSchema = z.object({
  strengths: nullableText,
  improvements: nullableText,
  requiredSkills: nullableText,
})

const salarySchema = z.object({
  oldSalary: z.number().min(0).nullable().optional(),
  newSalary: z.number().min(0).nullable().optional(),
  bonus: z.number().min(0).nullable().optional(),
  bonusDeduction: z.number().min(0).nullable().optional(),
  bonusPolicy: z.string().trim().max(2000).nullable().optional(),
  effectiveDate: z.string().datetime().nullable().optional(),
})

const acknowledgementManualSchema = z.object({
  employeeSignedAt: z.string().datetime().nullable().optional(),
  evaluatorSignedAt: z.string().datetime().nullable().optional(),
  directorSignedAt: z.string().datetime().nullable().optional(),
})

const summarySchema = z.object({
  evaluateeName: z.string().trim().max(200).nullable().optional(),
  evaluatorName: z.string().trim().max(200).nullable().optional(),
  evaluationReason: z.enum(['PROBATION', 'ANNUAL', 'OTHER']).nullable().optional(),
  evaluationReasonOther: nullableText,
  evaluatorTitle: z.string().trim().max(200).nullable().optional(),
  performanceGrade: z.enum([
    'EXCELLENT', 'ABOVE_STANDARD', 'MEETS_STANDARD', 'ALMOST_STANDARD', 'BELOW_STANDARD',
  ]).nullable().optional(),
  effectiveDate: z.string().trim().min(1).nullable().optional(),
})

const gradeSchema = z.object({
  performanceGrade: z.enum([
    'EXCELLENT', 'ABOVE_STANDARD', 'MEETS_STANDARD', 'ALMOST_STANDARD', 'BELOW_STANDARD',
  ]),
})

export async function getFullEvaluation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await sectionService.getFullEvaluation(req.params.id))
  } catch (err) {
    next(err)
  }
}

export async function saveGoals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = goalsSchema.parse(req.body)
    await goalService.upsertGoalEntries(req.params.id, body.goals)
    await sectionService.recalculateTotalScore(req.params.id)
    res.json({ message: 'บันทึก Goal Setting สำเร็จ' })
  } catch (err) {
    next(err)
  }
}

export async function saveCompetency(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = competencySchema.parse(req.body)
    await competencyService.upsertCompetencyScores(req.params.id, body.scores)
    await sectionService.recalculateTotalScore(req.params.id)
    res.json({ message: 'บันทึก Competency สำเร็จ' })
  } catch (err) {
    next(err)
  }
}

export async function saveAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = attendanceSchema.parse(req.body)
    await attendanceService.upsertAttendanceScore(req.params.id, body)
    await sectionService.recalculateTotalScore(req.params.id)
    res.json({ message: 'บันทึก Attendance สำเร็จ' })
  } catch (err) {
    next(err)
  }
}

export async function saveTraining(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = trainingSchema.parse(req.body)
    const result = await trainingService.upsertTrainingScore(req.params.id, body)
    await sectionService.recalculateTotalScore(req.params.id)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function saveComment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = commentSchema.parse(req.body)
    res.json(await sectionService.upsertComment(req.params.id, body))
  } catch (err) {
    next(err)
  }
}

export async function saveSalary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = salarySchema.parse(req.body)
    res.json(await sectionService.upsertSalarySummary(req.params.id, body))
  } catch (err) {
    next(err)
  }
}

export async function saveAcknowledgement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = acknowledgementManualSchema.parse(req.body)
    res.json(await sectionService.saveAcknowledgementManual(req.params.id, body))
  } catch (err) {
    next(err)
  }
}

export async function saveSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = summarySchema.parse(req.body)
    res.json(await sectionService.upsertEvaluationSummary(req.params.id, body))
  } catch (err) {
    next(err)
  }
}

export async function saveGrade(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = gradeSchema.parse(req.body)
    res.json(await sectionService.setPerformanceGrade(req.params.id, body.performanceGrade))
  } catch (err) {
    next(err)
  }
}
