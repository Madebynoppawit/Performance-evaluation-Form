import { randomUUID } from 'node:crypto'
import { Request, Response, NextFunction } from 'express'

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,80}$/

declare global {
  namespace Express {
    interface Request {
      requestId?: string
      startedAt?: number
    }
  }
}

function getRequestId(header: unknown) {
  const value = Array.isArray(header) ? header[0] : header
  if (typeof value === 'string' && REQUEST_ID_PATTERN.test(value)) return value
  return randomUUID()
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  req.requestId = getRequestId(req.headers['x-request-id'])
  req.startedAt = Date.now()
  res.setHeader('X-Request-Id', req.requestId)
  next()
}
