import { Router } from 'express'
import { forgotPassword, login, register, me, updateMe } from '../controllers/authController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/login', login)
router.post('/register', register)
router.post('/forgot-password', forgotPassword)
router.get('/me', authenticate, me)
router.patch('/me', authenticate, updateMe)

export default router
