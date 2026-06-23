import { Router } from 'express'
import { list, getOne, create, updateStatus, remove } from '../controllers/cycleController'
import { authenticate, blockIfPasswordChangeRequired, requireRole } from '../middleware/auth'
import { MANAGER_GATES } from '../security/accessPolicy'
import { Role } from '@prisma/client'

const router = Router()

router.use(authenticate, blockIfPasswordChangeRequired)
router.get('/', list)
router.get('/:id', getOne)
// Supervisory roles can set up review periods, but changing a cycle's lifecycle
// state (e.g. CLOSED, which locks evaluations org-wide) and deleting cycles are
// governance actions reserved for admins/developers.
router.post('/', requireRole(...MANAGER_GATES), create)
router.patch('/:id/status', requireRole(Role.ADMIN), updateStatus)
router.delete('/:id', requireRole(Role.ADMIN), remove)

export default router
