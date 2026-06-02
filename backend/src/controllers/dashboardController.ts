import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import * as dashboardService from '../services/dashboardService'

export async function stats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await dashboardService.getDashboardStats(req.user!.userId, req.user!.role))
  } catch (err) {
    next(err)
  }
}
