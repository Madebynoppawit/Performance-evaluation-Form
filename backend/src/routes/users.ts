import { Router } from 'express'
import { authenticate, authorizeSupervisory, requireRole } from '../middleware/auth'
import { list, getOne, create, update, remove } from '../controllers/userController'

const router = Router()

router.use(authenticate)

// Supervisors/managers may read the list to pick an evaluatee, but creating,
// editing and deleting accounts stays with Developer/admin.
router.get('/',       authorizeSupervisory, list)
router.get('/:id',    requireRole('ADMIN'), getOne)
router.post('/',      requireRole('ADMIN'), create)
router.patch('/:id',  requireRole('ADMIN'), update)
router.delete('/:id', requireRole('ADMIN'), remove)

export default router
