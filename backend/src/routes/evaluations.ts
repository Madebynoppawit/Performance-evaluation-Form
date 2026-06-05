import { Router } from 'express'
import { list, saveAnswers, submit } from '../controllers/evaluationController'
import {
  getFullEvaluation,
  saveGoals,
  saveCompetency,
  saveAttendance,
  saveComment,
  saveSalary,
  acknowledge,
} from '../controllers/evaluationSectionController'
import { authenticate, authorizeEvaluationAccess, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', list)
router.get('/:id', authorizeEvaluationAccess, getFullEvaluation)
router.patch('/:id/answers', authorizeEvaluationAccess, saveAnswers)
router.patch('/:id/submit', authorizeEvaluationAccess, submit)

router.patch('/:id/goals', authorizeEvaluationAccess, saveGoals)
router.patch('/:id/competency', authorizeEvaluationAccess, saveCompetency)
router.patch('/:id/attendance', authorizeEvaluationAccess, saveAttendance)
router.patch('/:id/comment', authorizeEvaluationAccess, saveComment)
router.patch('/:id/salary', authorizeEvaluationAccess, requireRole('ADMIN', 'MANAGER'), saveSalary)
router.post('/:id/acknowledge', authorizeEvaluationAccess, acknowledge)

export default router
