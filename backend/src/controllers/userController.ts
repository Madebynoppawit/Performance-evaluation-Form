import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import * as userService from '../services/userService'
import * as employeeImport from '../services/employeeImportService'
import { companyEmailSchema } from '../utils/companyEmail'
import { recordAuditEventBestEffort } from '../services/auditEventService'
import { Position, Role } from '@prisma/client'
import { passwordSchema } from '../validation/passwordPolicy'

const createSchema = z.object({
  email:       companyEmailSchema,
  name:        z.string().min(1),
  password:    passwordSchema,
  role:        z.nativeEnum(Role),
  position:    z.nativeEnum(Position).optional(),
  department:  z.string().optional(),
  managerId:   z.string().optional(),
  employeeNo:  z.string().trim().min(1).nullable().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

const updateSchema = z.object({
  name:        z.string().min(1).optional(),
  role:        z.nativeEnum(Role).optional(),
  position:    z.nativeEnum(Position).optional(),
  department:  z.string().optional(),
  managerId:   z.string().nullable().optional(),
  password:    passwordSchema.optional(),
  jobTitle:    z.string().max(120).nullable().optional(),
  employeeNo:  z.string().trim().min(1).nullable().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export async function list(_req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json(await userService.getAllUsers()) }
  catch (err) { next(err) }
}

export async function directory(_req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json(await userService.getDirectory()) }
  catch (err) { next(err) }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json(await userService.getUserById(req.params.id)) }
  catch (err) { next(err) }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body)
    res.status(201).json(await userService.createUser(body))
  } catch (err) { next(err) }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = updateSchema.parse(req.body)
    const parsed = {
      ...body,
      dateOfBirth: body.dateOfBirth != null
        ? new Date(`${body.dateOfBirth}T00:00:00Z`)
        : body.dateOfBirth === null ? null : undefined,
    }
    res.json(await userService.updateUser(req.params.id, parsed))
  } catch (err) { next(err) }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await userService.deleteUser(req.params.id)
    res.status(204).send()
  } catch (err) {
    if (err instanceof userService.LastAdminError) {
      res.status(409).json({ message: 'Cannot delete the last administrator account.', requestId: req.requestId })
      return
    }
    next(err)
  }
}

export async function resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await userService.resetPassword(req.params.id)
    recordAuditEventBestEffort({
      eventType: 'admin_reset_password',
      actor: { userId: req.user!.userId, role: req.user!.role },
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
      targetType: 'user',
      targetId: req.params.id,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null,
    })
    res.json(result)
  } catch (err) { next(err) }
}

export async function importEmployees(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const text = typeof req.body === 'string' ? req.body : ''
    if (!text.trim()) {
      res.status(400).json({ message: 'Empty file — paste or upload a CSV/TSV employee export.', requestId: req.requestId })
      return
    }
    const filename = typeof req.query.filename === 'string' ? req.query.filename : undefined
    const summary = await employeeImport.importEmployees(text, filename, req.user!.userId)
    res.status(201).json(summary)
  } catch (err) { next(err) }
}

export async function importHistory(_req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json(await employeeImport.getImportHistory()) }
  catch (err) { next(err) }
}
