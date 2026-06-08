import { Response, NextFunction } from 'express'
import { EvaluationType } from '@prisma/client'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import * as evaluationService from '../services/evaluationService'
import { assertEvaluationReadyForSubmit } from '../services/evaluationSectionService'

const createSchema = z.object({
  cycleId: z.string().min(1, 'Cycle is required'),
  evaluateeId: z.string().min(1, 'Evaluatee is required'),
  evaluatorId: z.string().min(1, 'Evaluator is required'),
  type: z.nativeEnum(EvaluationType),
})

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

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body)
    res.status(201).json(await evaluationService.createEvaluation(body))
  } catch (err) {
    next(err)
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await evaluationService.deleteEvaluation(req.params.id)
    res.status(204).send()
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
    await assertEvaluationReadyForSubmit(req.params.id)
    const ev = await evaluationService.submitEvaluation(req.params.id, req.body.answers ?? {})
    res.json(ev)
  } catch (err) {
    next(err)
  }
}
