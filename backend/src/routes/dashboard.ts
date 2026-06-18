import { Router } from 'express'
import { stats } from '../controllers/dashboardController'
import { authenticate, blockIfPasswordChangeRequired } from '../middleware/auth'

const router = Router()

router.use(authenticate, blockIfPasswordChangeRequired)
router.get('/stats', stats)

export default router
