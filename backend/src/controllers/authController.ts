import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from '../services/authService'
import { AuthRequest } from '../middleware/auth'
import { env } from '../config/env'
import { companyEmailSchema } from '../utils/companyEmail'
import { recordAuditEventBestEffort } from '../services/auditEventService'

const loginSchema = z.object({
  email: z.string().email().transform((email) => email.trim().toLowerCase()),
  password: z.string().min(1),
})

const registerSchema = z.object({
  email: companyEmailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  name: z.string().min(1, 'Name is required'),
  department: z.string().optional(),
})

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body)
    const result = await authService.login(body.email, body.password)
    recordAuditEventBestEffort({
      eventType: 'auth_login_success',
      actor: { userId: result.user.id, role: result.user.role },
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null,
    })
    res.json(result)
  } catch (err) {
    if ((err as Error).message === 'Invalid credentials') {
      recordAuditEventBestEffort({
        eventType: 'auth_login_failed',
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: 401,
        ip: req.ip,
        userAgent: req.get('user-agent') ?? null,
        metadata: { email: typeof req.body?.email === 'string' ? req.body.email : undefined },
      })
      res.status(401).json({ message: 'Incorrect email or password', requestId: req.requestId })
      return
    }
    next(err)
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    if (!env.allowPublicRegistration) {
      res.status(403).json({ message: 'Public registration is disabled', requestId: req.requestId })
      return
    }

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
