import { Request, Response, NextFunction } from 'express'
import { recordAuditEventBestEffort } from '../services/auditEventService'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function auditLog(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) {
    next()
    return
  }

  const startedAt = Date.now()
  res.on('finish', () => {
    const authedReq = req as Request & { user?: { userId: string; role: string } }
    const actor = authedReq.user
      ? { userId: authedReq.user.userId, role: authedReq.user.role }
      : null

    const event = {
      ts: new Date().toISOString(),
      level: 'audit',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      actor,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null,
    }

    console.info(JSON.stringify(event))
    recordAuditEventBestEffort({
      eventType: 'http_mutation',
      actor,
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null,
      metadata: { durationMs: event.durationMs },
    })
  })

  next()
}
