import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from '../services/authService'
import { AuthRequest } from '../middleware/auth'
import { env } from '../config/env'
import { companyEmailSchema } from '../utils/companyEmail'
import { recordAuditEventBestEffort } from '../services/auditEventService'
import { passwordSchema } from '../validation/passwordPolicy'

// Login identifier is an employee number or an email (back-compat: still
// accepts an `email` field from older clients).
const loginSchema = z.object({
  identifier: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
  password: z.string().min(1),
}).refine((d) => d.identifier || d.email, { message: 'Employee number or email is required', path: ['identifier'] })

const registerSchema = z.object({
  email: companyEmailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required'),
  department: z.string().optional(),
})

const forgotPasswordSchema = z.object({
  employeeNo: z.string().trim().min(1, 'Employee number is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth is required'),
  password: passwordSchema,
  confirm: z.string().min(1, 'Confirm password is required'),
}).strict().refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body)
    const result = await authService.login((body.identifier ?? body.email)!, body.password)
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
        metadata: { identifier: typeof req.body?.identifier === 'string' ? req.body.identifier : (typeof req.body?.email === 'string' ? req.body.email : undefined) },
      })
      res.status(401).json({ message: 'Incorrect employee number or password', requestId: req.requestId })
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

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const body = forgotPasswordSchema.parse(req.body)
    const result = await authService.resetPasswordWithIdentity(body)
    recordAuditEventBestEffort({
      eventType: 'auth_password_self_reset',
      actor: { userId: result.userId, role: result.role },
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
      targetType: 'user',
      targetId: result.userId,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null,
    })
    res.json({ ok: true })
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

const updateMeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  email: companyEmailSchema.optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
  password: passwordSchema.optional(),
}).strict()

export async function updateMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = updateMeSchema.parse(req.body)
    const user = await authService.updateProfile(req.user!.userId, body)
    if (body.password) {
      recordAuditEventBestEffort({
        eventType: 'auth_password_changed',
        actor: { userId: req.user!.userId, role: req.user!.role },
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: 200,
        targetType: 'user',
        targetId: req.user!.userId,
        ip: req.ip,
        userAgent: req.get('user-agent') ?? null,
      })
    }
    res.json(user)
  } catch (err) {
    next(err)
  }
}
