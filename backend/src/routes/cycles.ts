import { Router } from 'express'
import { list, getOne, create, updateStatus, remove } from '../controllers/cycleController'
import { authenticate, blockIfPasswordChangeRequired, requireRole } from '../middleware/auth'
import { MANAGER_GATES } from '../security/accessPolicy'

const router = Router()

router.use(authenticate, blockIfPasswordChangeRequired)
router.get('/', list)
router.get('/:id', getOne)
router.post('/', requireRole(...MANAGER_GATES), create)
router.patch('/:id/status', requireRole(...MANAGER_GATES), updateStatus)
router.delete('/:id', requireRole(...MANAGER_GATES), remove)

export default router
