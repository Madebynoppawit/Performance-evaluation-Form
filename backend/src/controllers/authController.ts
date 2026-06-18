import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from '../services/authService'
import { AuthRequest } from '../middleware/auth'
import { env } from '../config/env'
import { companyEmailSchema } from '../utils/companyEmail'
import { recordAuditEventBestEffort } from '../services/auditEventService'
import { passwordSchema } from '../validation/passwordPolicy'

const forgotSchema = z.object({
  employeeNo:  z.string().trim().min(1, 'Employee number is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
})

const resetSchema = z.object({
  token:    z.string().min(1),
  password: passwordSchema,
})

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

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { employeeNo, dateOfBirth } = forgotSchema.parse(req.body)
    // Reset token is delivered out-of-band (email link) only — never returned in
    // the response. Employee No + date of birth are low-entropy and often known
    // to colleagues, so handing the token to the requester would allow account
    // takeover. Always return a generic response to avoid user enumeration.
    await authService.requestPasswordReset(employeeNo, dateOfBirth)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = resetSchema.parse(req.body)
    await authService.resetPassword(token, password)
    recordAuditEventBestEffort({
      eventType: 'auth_password_changed',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null,
      metadata: { via: 'forgot_password' },
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ message: 'Reset link has expired or is invalid. Please try again.' })
  }
}

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
