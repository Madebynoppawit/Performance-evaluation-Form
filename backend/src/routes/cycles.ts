import { Router } from 'express'
import { list, getOne, create, updateStatus, remove } from '../controllers/cycleController'
import { authenticate, requireRole } from '../middleware/auth'
import { Role } from '@prisma/client'

const router = Router()

router.use(authenticate)
router.get('/', list)
router.get('/:id', getOne)
router.post('/', requireRole(Role.ADMIN, Role.MANAGER), create)
router.patch('/:id/status', requireRole(Role.ADMIN), updateStatus)
router.delete('/:id', requireRole(Role.ADMIN), remove)

export default router
