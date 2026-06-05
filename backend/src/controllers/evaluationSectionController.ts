import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import * as goalService from '../services/goalService'
import * as competencyService from '../services/competencyService'
import * as attendanceService from '../services/attendanceService'
import * as sectionService from '../services/evaluationSectionService'

const nullableText = z.string().trim().max(2000).nullable().optional()

const goalsSchema = z.object({
  goals: z.array(z.object({
    id: z.string().min(1).optional(),
    goal: z.string().trim().min(1).max(500),
    goalDescription: nullableText,
    weight: z.number().min(0).max(100),
    targetRating5: nullableText,
    targetRating4: nullableText,
    targetRating3: nullableText,
    targetRating2: nullableText,
    targetRating1: nullableText,
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

const acknowledgementSchema = z.object({
  signerType: z.enum(['employee', 'evaluator', 'director']),
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

export async function acknowledge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = acknowledgementSchema.parse(req.body)
    res.json(await sectionService.signAcknowledgement(req.params.id, body.signerType, req.user!))
  } catch (err) {
    next(err)
  }
}
