import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import * as goalService from '../services/goalService'
import * as competencyService from '../services/competencyService'
import * as attendanceService from '../services/attendanceService'
import * as sectionService from '../services/evaluationSectionService'

export async function getFullEvaluation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await sectionService.getFullEvaluation(req.params.id))
  } catch (err) {
    next(err)
  }
}

export async function saveGoals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await goalService.upsertGoalEntries(req.params.id, req.body.goals ?? [])
    await sectionService.recalculateTotalScore(req.params.id)
    res.json({ message: 'บันทึก Goal Setting สำเร็จ' })
  } catch (err) {
    next(err)
  }
}

export async function saveCompetency(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await competencyService.upsertCompetencyScores(req.params.id, req.body.scores ?? [])
    await sectionService.recalculateTotalScore(req.params.id)
    res.json({ message: 'บันทึก Competency สำเร็จ' })
  } catch (err) {
    next(err)
  }
}

export async function saveAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await attendanceService.upsertAttendanceScore(req.params.id, req.body)
    await sectionService.recalculateTotalScore(req.params.id)
    res.json({ message: 'บันทึก Attendance สำเร็จ' })
  } catch (err) {
    next(err)
  }
}

export async function saveComment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await sectionService.upsertComment(req.params.id, req.body))
  } catch (err) {
    next(err)
  }
}

export async function saveSalary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await sectionService.upsertSalarySummary(req.params.id, req.body))
  } catch (err) {
    next(err)
  }
}

export async function acknowledge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const signerType = req.body.signerType as 'employee' | 'evaluator' | 'director'
    res.json(await sectionService.signAcknowledgement(req.params.id, signerType))
  } catch (err) {
    next(err)
  }
}
