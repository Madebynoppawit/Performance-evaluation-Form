import { Response, NextFunction } from 'express'
import { EvaluationType, Position } from '@prisma/client'
import { z } from 'zod'
import { AuthRequest, isAdminRole } from '../middleware/auth'
import * as evaluationService from '../services/evaluationService'
import { assertEvaluationReadyForSubmit } from '../services/evaluationSectionService'

const positionEnum = z.nativeEnum(Position)

const createSchema = z
  .object({
    cycleId: z.string().min(1, 'Cycle is required'),
    evaluatorId: z.string().min(1, 'Evaluator is required'),
    evaluatorName: z.string().trim().max(500).optional(),
    type: z.nativeEnum(EvaluationType).optional().default(EvaluationType.MANAGER),
    // Either pick an existing employee…
    evaluateeId: z.string().min(1).optional(),
    // …or add a new one inline (a real employee record is created).
    newEvaluatee: z
      .object({
        name: z.string().trim().min(1, 'Employee name is required').max(500),
        position: positionEnum,
        department: z.string().trim().max(500).optional(),
        jobTitle: z.string().trim().max(200).optional(),
      })
      .optional(),
    // Optional second-stage reviewer (manager) for 2-stage workflow.
    reviewerId: z.string().min(1).optional(),
  })
  .refine((d) => Boolean(d.evaluateeId) !== Boolean(d.newEvaluatee), {
    message: 'Provide either an existing evaluatee or a new employee.',
    path: ['evaluateeId'],
  })

const submitReviewSchema = z.object({
  reviewerComment: z.string().max(2000).optional(),
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
    // Creating an employee account is reserved for Developer/admin — others
    // must pick an existing evaluatee.
    if (body.newEvaluatee && !isAdminRole(req.user!.role)) {
      res.status(403).json({
        message: 'Only Developer/admin can create new employee accounts. Please select an existing employee.',
        requestId: req.requestId,
      })
      return
    }
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

export async function submitReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { reviewerComment } = submitReviewSchema.parse(req.body)
    const ev = await evaluationService.submitReview(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      reviewerComment,
    )
    res.json(ev)
  } catch (err) {
    next(err)
  }
}
