import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import * as cycleService from '../services/cycleService'
import { CycleStatus } from '@prisma/client'

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (YYYY-MM-DD)')

const createSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(120),
  templateId:  z.string().min(1, 'Template is required'),
  startDate:   dateStr,
  endDate:     dateStr,
  description: z.string().max(500).optional(),
}).refine(d => d.endDate > d.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
})

const updateStatusSchema = z.object({
  status: z.nativeEnum(CycleStatus),
})

export async function list(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await cycleService.getAllCycles())
  } catch (err) { next(err) }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await cycleService.getCycleById(req.params.id))
  } catch (err) { next(err) }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body)
    res.status(201).json(await cycleService.createCycle(body))
  } catch (err) { next(err) }
}

export async function updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = updateStatusSchema.parse(req.body)
    res.json(await cycleService.updateCycleStatus(req.params.id, status))
  } catch (err) { next(err) }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await cycleService.deleteCycle(req.params.id)
    res.status(204).send()
  } catch (err) { next(err) }
}
