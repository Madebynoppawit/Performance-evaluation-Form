import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import * as evaluationService from '../services/evaluationService'

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const evals = await evaluationService.getEvaluationsForUser(req.user!.userId, req.user!.role)
    res.json(evals)
  } catch (err) {
    next(err)
  }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ev = await evaluationService.getEvaluationById(req.params.id)
    res.json(ev)
  } catch (err) {
    next(err)
  }
}

export async function saveAnswers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await evaluationService.saveAnswers(req.params.id, req.body.answers ?? {})
    res.json({ message: 'บันทึกสำเร็จ' })
  } catch (err) {
    next(err)
  }
}

export async function submit(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ev = await evaluationService.submitEvaluation(req.params.id, req.body.answers ?? {})
    res.json(ev)
  } catch (err) {
    next(err)
  }
}
