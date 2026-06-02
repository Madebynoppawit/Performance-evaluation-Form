import { Router } from 'express'
import { summary } from '../controllers/reportController'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)
router.get('/summary', requireRole('ADMIN', 'MANAGER'), summary)

export default router
