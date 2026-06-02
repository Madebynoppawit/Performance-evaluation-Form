import { Router } from 'express'
import { list, getOne, create, updateStatus } from '../controllers/cycleController'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)
router.get('/', list)
router.get('/:id', getOne)
router.post('/', requireRole('ADMIN', 'MANAGER'), create)
router.patch('/:id/status', requireRole('ADMIN'), updateStatus)

export default router
