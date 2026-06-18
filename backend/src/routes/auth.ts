import { Router } from 'express'
import { login, register, me, updateMe } from '../controllers/authController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/login', login)
router.post('/register', register)
// Self-service password reset is intentionally not exposed: there is no email
// delivery, so a token issued from knowledge factors (employee no + DOB) could
// not be delivered out-of-band. Resets are admin-initiated
// (POST /users/:id/reset-password) followed by the enforced first-login change.
router.get('/me', authenticate, me)
router.patch('/me', authenticate, updateMe)

export default router
