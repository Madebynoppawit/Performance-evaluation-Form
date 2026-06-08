import { Router } from 'express'
import { create, list, remove, saveAnswers, submit } from '../controllers/evaluationController'
import {
  getFullEvaluation,
  saveGoals,
  saveCompetency,
  saveAttendance,
  saveTraining,
  saveComment,
  saveSalary,
  saveSummary,
  acknowledge,
} from '../controllers/evaluationSectionController'
import { authenticate, authorizeEvaluationAccess, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', list)
router.post('/', requireRole('ADMIN'), create)
router.get('/:id', authorizeEvaluationAccess, getFullEvaluation)
router.delete('/:id', requireRole('ADMIN'), remove)
router.patch('/:id/answers', authorizeEvaluationAccess, saveAnswers)
router.patch('/:id/submit', authorizeEvaluationAccess, submit)

router.patch('/:id/goals', authorizeEvaluationAccess, saveGoals)
router.patch('/:id/competency', authorizeEvaluationAccess, saveCompetency)
router.patch('/:id/attendance', authorizeEvaluationAccess, saveAttendance)
router.patch('/:id/training', authorizeEvaluationAccess, saveTraining)
router.patch('/:id/comment', authorizeEvaluationAccess, saveComment)
router.patch('/:id/salary', authorizeEvaluationAccess, requireRole('ADMIN', 'MANAGER'), saveSalary)
router.patch('/:id/summary', authorizeEvaluationAccess, saveSummary)
router.post('/:id/acknowledge', authorizeEvaluationAccess, acknowledge)

export default router
