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
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', list)
router.get('/:id', getFullEvaluation)
router.patch('/:id/answers', saveAnswers)
router.patch('/:id/submit', submit)

router.patch('/:id/goals', saveGoals)
router.patch('/:id/competency', saveCompetency)
router.patch('/:id/attendance', saveAttendance)
router.patch('/:id/comment', saveComment)
router.patch('/:id/salary', requireRole('ADMIN', 'MANAGER'), saveSalary)
router.post('/:id/acknowledge', acknowledge)

export default router
