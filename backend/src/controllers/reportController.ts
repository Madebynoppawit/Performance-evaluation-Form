import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import * as reportService from '../services/reportService'

export async function summary(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await reportService.getSummaryReport())
  } catch (err) {
    next(err)
  }
}
