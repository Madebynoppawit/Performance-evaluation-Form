import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from '../services/authService'
import { AuthRequest } from '../middleware/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const registerSchema = loginSchema.extend({
  name: z.string().min(1),
  department: z.string().optional(),
})

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body)
    const result = await authService.login(body.email, body.password)
    res.json(result)
  } catch (err) {
    if ((err as Error).message?.includes('ไม่พบ') || (err as Error).message?.includes('ไม่ถูกต้อง')) {
      res.status(401).json({ message: (err as Error).message })
      return
    }
    next(err)
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerSchema.parse(req.body)
    const result = await authService.register(body)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await authService.getProfile(req.user!.userId)
    res.json(user)
  } catch (err) {
    next(err)
  }
}
