import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import * as reportService from '../services/reportService'
import { recordAuditEventBestEffort } from '../services/auditEventService'

export async function summary(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await reportService.getSummaryReport())
  } catch (err) {
    next(err)
  }
}

export async function auditEvents(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await reportService.getAuditEvents())
  } catch (err) {
    next(err)
  }
}

export async function exportEvaluation(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized', requestId: req.requestId })
    return
  }

  try {
    const result = await reportService.exportEvaluationCsv(req.params.id, req.user)
    recordAuditEventBestEffort({
      eventType: 'evaluation_export_csv',
      actor: req.user,
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
      targetType: 'Evaluation',
      targetId: req.params.id,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null,
      metadata: {
        filename: result.filename,
        scope: result.scope,
      },
    })
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    res.send(result.csv)
  } catch (err) {
    next(err)
  }
}
