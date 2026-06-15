import { Router } from 'express'
import { list, getOne, create, update, remove, addSection, addQuestion } from '../controllers/templateController'
import { authenticate, authorizeSupervisory, requireRole } from '../middleware/auth'
import { Role } from '@prisma/client'

const router = Router()

router.use(authenticate)
router.get('/', list)
router.get('/:id', getOne)
// Supervisor / Manager / Director-up (and admins) can build templates.
router.post('/', authorizeSupervisory, create)
router.patch('/:id', authorizeSupervisory, update)
router.delete('/:id', requireRole(Role.ADMIN), remove)
router.post('/:id/sections', authorizeSupervisory, addSection)
router.post('/sections/:sectionId/questions', authorizeSupervisory, addQuestion)

export default router
