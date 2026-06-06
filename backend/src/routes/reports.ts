import { Router } from 'express'
import { auditEvents, exportEvaluation, summary } from '../controllers/reportController'
import { authenticate, authorizeEvaluationAccess, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)
router.get('/summary', requireRole('ADMIN', 'MANAGER'), summary)
router.get('/audit-events', requireRole('ADMIN'), auditEvents)
router.get('/evaluations/:id/export', authorizeEvaluationAccess, exportEvaluation)

export default router
