import { Router } from 'express'
import { list, getOne, create, update, remove, addSection, addQuestion } from '../controllers/templateController'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)
router.get('/', list)
router.get('/:id', getOne)
router.post('/', requireRole('ADMIN'), create)
router.patch('/:id', requireRole('ADMIN'), update)
router.delete('/:id', requireRole('ADMIN'), remove)
router.post('/:id/sections', requireRole('ADMIN'), addSection)
router.post('/sections/:sectionId/questions', requireRole('ADMIN'), addQuestion)

export default router
