import { Router } from 'express'
import { auditEvents, exportEvaluation, summary } from '../controllers/reportController'
import { authenticate, authorizeEvaluation, blockIfPasswordChangeRequired, requireRole } from '../middleware/auth'
import { MANAGER_GATES } from '../security/accessPolicy'

const router = Router()

router.use(authenticate, blockIfPasswordChangeRequired)
router.get('/summary', requireRole(...MANAGER_GATES), summary)
router.get('/audit-events', requireRole(...MANAGER_GATES), auditEvents)
router.get('/evaluations/:id/export', authorizeEvaluation('read'), exportEvaluation)

export default router
