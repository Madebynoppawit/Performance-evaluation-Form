import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import * as userService from '../services/userService'
import { companyEmailSchema } from '../utils/companyEmail'

const createSchema = z.object({
  email:      companyEmailSchema,
  name:       z.string().min(1),
  password:   z.string().min(6),
  role:       z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  position:   z.enum(['DIRECTOR_UP', 'MANAGER', 'OFFICER', 'SUPERVISOR', 'PRODUCTION_STAFF']).optional(),
  department: z.string().optional(),
  managerId:  z.string().optional(),
})

const updateSchema = z.object({
  name:       z.string().min(1).optional(),
  role:       z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  position:   z.enum(['DIRECTOR_UP', 'MANAGER', 'OFFICER', 'SUPERVISOR', 'PRODUCTION_STAFF']).optional(),
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
  } catch (err) { next(err) }
}
