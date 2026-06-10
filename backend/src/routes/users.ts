import { Router, text } from 'express'
import { authenticate, authorizeSupervisory, requireRole } from '../middleware/auth'
import { list, getOne, create, update, remove, importEmployees, importHistory } from '../controllers/userController'

const router = Router()

router.use(authenticate)

// Supervisors/managers may read the list to pick an evaluatee, but creating,
// editing, importing and deleting accounts stays with Developer/admin.
router.get('/',        authorizeSupervisory, list)
// Employee master-file import (literal paths before the /:id matcher).
router.get('/imports', requireRole('ADMIN'), importHistory)
router.post('/import', requireRole('ADMIN'), text({ type: () => true, limit: '15mb' }), importEmployees)
router.get('/:id',     requireRole('ADMIN'), getOne)
router.post('/',       requireRole('ADMIN'), create)
router.patch('/:id',   requireRole('ADMIN'), update)
router.delete('/:id',  requireRole('ADMIN'), remove)

export default router
