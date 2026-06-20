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
  saveGrade,
  saveAcknowledgement,
} from '../controllers/evaluationSectionController'
import { authenticate, authorizeEvaluation, authorizeSupervisory, blockIfPasswordChangeRequired, requireRole } from '../middleware/auth'
import { Role } from '@prisma/client'

const router = Router()

router.use(authenticate, blockIfPasswordChangeRequired)

router.get('/', list)
router.post('/', authorizeSupervisory, create)
router.get('/:id', authorizeEvaluation('read'), getFullEvaluation)
router.delete('/:id', requireRole(Role.ADMIN), remove)
router.patch('/:id/answers', authorizeEvaluation('edit'), saveAnswers)
router.patch('/:id/submit', authorizeEvaluation('edit'), submit)
router.patch('/:id/review', authorizeEvaluation('review'), submitReview)

router.patch('/:id/goals', authorizeEvaluation('edit'), saveGoals)
router.patch('/:id/competency', authorizeEvaluation('edit'), saveCompetency)
router.patch('/:id/attendance', authorizeEvaluation('edit'), saveAttendance)
router.patch('/:id/training', authorizeEvaluation('edit'), saveTraining)
router.patch('/:id/comment', authorizeEvaluation('edit'), saveComment)
router.patch('/:id/salary', authorizeEvaluation('salary'), saveSalary)
router.patch('/:id/summary', authorizeEvaluation('edit'), saveSummary)
router.patch('/:id/grade', authorizeEvaluation('calibrate'), saveGrade)
router.patch('/:id/acknowledgement', authorizeEvaluation('acknowledgement'), saveAcknowledgement)

export default router
