import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import * as userService from '../services/userService'
import * as employeeImport from '../services/employeeImportService'
import { companyEmailSchema } from '../utils/companyEmail'

const createSchema = z.object({
  email:      companyEmailSchema,
  name:       z.string().min(1),
  password:   z.string().min(6),
  role:       z.enum(['DEVELOPER', 'ADMIN', 'MANAGER', 'EMPLOYEE']),
  position:   z.enum(['CEO', 'MANAGING_DIRECTOR', 'DIRECTOR_UP', 'MANAGER', 'OFFICER', 'SUPERVISOR', 'PRODUCTION_STAFF']).optional(),
  department: z.string().optional(),
  managerId:  z.string().optional(),
})

const updateSchema = z.object({
  name:       z.string().min(1).optional(),
  role:       z.enum(['DEVELOPER', 'ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  position:   z.enum(['CEO', 'MANAGING_DIRECTOR', 'DIRECTOR_UP', 'MANAGER', 'OFFICER', 'SUPERVISOR', 'PRODUCTION_STAFF']).optional(),
  department: z.string().optional(),
  managerId:  z.string().nullable().optional(),
  password:   z.string().min(6).optional(),
})

export async function list(_req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json(await userService.getAllUsers()) }
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
    res.json(await userService.updateUser(req.params.id, body))
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
