import { Router, text } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import { list, getOne, create, update, remove, importEmployees, importHistory, resetPassword, directory } from '../controllers/userController'

const router = Router()

router.use(authenticate)

// Lightweight employee directory — any authenticated user can fetch this
// (needed by supervisors/managers when creating evaluations).
router.get('/directory', directory)

router.get('/',        requireRole('ADMIN'), list)
// Employee master-file import (literal paths before the /:id matcher).
router.get('/imports', requireRole('ADMIN'), importHistory)
router.post('/import', requireRole('ADMIN'), text({ type: () => true, limit: '15mb' }), importEmployees)
router.get('/:id',     requireRole('ADMIN'), getOne)
router.post('/',       requireRole('ADMIN'), create)
router.patch('/:id',   requireRole('ADMIN'), update)
router.post('/:id/reset-password', requireRole('ADMIN'), resetPassword)
router.delete('/:id',  requireRole('ADMIN'), remove)

export default router
