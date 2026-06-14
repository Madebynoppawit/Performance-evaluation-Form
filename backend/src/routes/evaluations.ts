import { Router } from 'express'
import { create, list, remove, saveAnswers, submit, submitReview } from '../controllers/evaluationController'
import {
  getFullEvaluation,
  saveGoals,
  saveCompetency,
  saveAttendance,
  saveTraining,
  saveComment,
  saveSalary,
  saveSummary,
  saveAcknowledgement,
} from '../controllers/evaluationSectionController'
import { authenticate, authorizeEvaluationAccess, authorizeSupervisory, requireRole } from '../middleware/auth'
import type { Response, NextFunction } from 'express'
import type { AuthRequest } from '../middleware/auth'

function blockAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role === 'ADMIN') {
    res.status(403).json({ message: 'Evaluations are read-only for Admin accounts.', requestId: (req as any).requestId })
    return
  }
  next()
}

const router = Router()

router.use(authenticate)

router.get('/', list)
router.post('/', authorizeSupervisory, create)
router.get('/:id', authorizeEvaluationAccess, getFullEvaluation)
router.delete('/:id', requireRole('ADMIN'), remove)
router.patch('/:id/answers', authorizeEvaluationAccess, blockAdmin, saveAnswers)
router.patch('/:id/submit', authorizeEvaluationAccess, blockAdmin, submit)
router.patch('/:id/review', authorizeEvaluationAccess, blockAdmin, submitReview)

router.patch('/:id/goals', authorizeEvaluationAccess, blockAdmin, saveGoals)
router.patch('/:id/competency', authorizeEvaluationAccess, blockAdmin, saveCompetency)
router.patch('/:id/attendance', authorizeEvaluationAccess, blockAdmin, saveAttendance)
router.patch('/:id/training', authorizeEvaluationAccess, blockAdmin, saveTraining)
router.patch('/:id/comment', authorizeEvaluationAccess, blockAdmin, saveComment)
router.patch('/:id/salary', authorizeEvaluationAccess, blockAdmin, requireRole('DEVELOPER', 'MANAGER'), saveSalary)
router.patch('/:id/summary', authorizeEvaluationAccess, blockAdmin, saveSummary)
router.patch('/:id/acknowledgement', authorizeEvaluationAccess, requireRole('DEVELOPER', 'MANAGER'), saveAcknowledgement)

export default router
