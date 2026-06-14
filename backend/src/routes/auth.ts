import { Router } from 'express'
import { login, register, me, updateMe, forgotPassword, resetPassword } from '../controllers/authController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/login', login)
router.post('/register', register)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.get('/me', authenticate, me)
router.patch('/me', authenticate, updateMe)

export default router
