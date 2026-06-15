import { Router } from 'express'
import { auditEvents, exportEvaluation, summary } from '../controllers/reportController'
import { authenticate, authorizeEvaluation, requireRole } from '../middleware/auth'
import { Role } from '@prisma/client'

const router = Router()

router.use(authenticate)
router.get('/summary', requireRole(Role.ADMIN, Role.MANAGER), summary)
router.get('/audit-events', requireRole(Role.ADMIN), auditEvents)
router.get('/evaluations/:id/export', authorizeEvaluation('read'), exportEvaluation)

export default router
