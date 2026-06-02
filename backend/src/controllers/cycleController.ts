import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import * as cycleService from '../services/cycleService'
import { CycleStatus } from '@prisma/client'

export async function list(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await cycleService.getAllCycles())
  } catch (err) {
    next(err)
  }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await cycleService.getCycleById(req.params.id))
  } catch (err) {
    next(err)
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await cycleService.createCycle(req.body))
  } catch (err) {
    next(err)
  }
}

export async function updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const status = req.body.status as CycleStatus
    res.json(await cycleService.updateCycleStatus(req.params.id, status))
  } catch (err) {
    next(err)
  }
}
