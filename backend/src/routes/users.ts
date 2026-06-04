import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import { list, getOne, create, update, remove } from '../controllers/userController'

const router = Router()

router.use(authenticate, requireRole('ADMIN'))

router.get('/',       list)
router.get('/:id',   getOne)
router.post('/',     create)
router.patch('/:id', update)
router.delete('/:id', remove)

export default router
