import { Router, text } from 'express'
import { authenticate, blockIfPasswordChangeRequired, requireRole } from '../middleware/auth'
import { Role } from '@prisma/client'
import { list, getOne, create, update, remove, importEmployees, importHistory, resetPassword, directory } from '../controllers/userController'

const router = Router()

router.use(authenticate, blockIfPasswordChangeRequired)

// Lightweight employee directory — any authenticated user can fetch this
// (needed by supervisors/managers when creating evaluations).
router.get('/directory', directory)

router.get('/',        requireRole(Role.ADMIN), list)
// Employee master-file import (literal paths before the /:id matcher).
router.get('/imports', requireRole(Role.ADMIN), importHistory)
router.post('/import', requireRole(Role.ADMIN), text({ type: () => true, limit: '15mb' }), importEmployees)
router.get('/:id',     requireRole(Role.ADMIN), getOne)
router.post('/',       requireRole(Role.ADMIN), create)
router.patch('/:id',   requireRole(Role.ADMIN), update)
router.post('/:id/reset-password', requireRole(Role.ADMIN), resetPassword)
router.delete('/:id',  requireRole(Role.ADMIN), remove)

export default router
