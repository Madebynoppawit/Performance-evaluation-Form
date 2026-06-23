import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { reportError } from '../config/monitoring'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const ts = new Date().toISOString()
  const isZod = err instanceof ZodError
  const isPrismaKnown = err instanceof Prisma.PrismaClientKnownRequestError
  const prismaStatus = isPrismaKnown
    ? err.code === 'P2002'
      ? 409
      : err.code === 'P2025'
        ? 404
        : undefined
    : undefined
  const status = isZod ? 400 : (prismaStatus ?? (err as { status?: number }).status ?? 500)

  console.error(JSON.stringify({
    ts,
    level: 'error',
    method: req.method,
    path: req.path,
    status,
    requestId: req.requestId,
    error: err instanceof Error
      ? { message: err.message, stack: err.stack?.split('\n').slice(0, 4) }
      : String(err),
  }))

  if (isZod) {
    res.status(400).json({
      message: 'Invalid request data',
      requestId: req.requestId,
      errors: err.flatten().fieldErrors,
    })
    return
  }

  if (status >= 500) reportError(err)

  const message = isPrismaKnown && err.code === 'P2002'
    ? 'Resource already exists'
    : isPrismaKnown && err.code === 'P2025'
      ? 'Resource not found'
      : err instanceof Error
        ? err.message
        : 'Unexpected server error'
  // Never leak internal error details (Prisma internals, unexpected exception
  // messages) to clients — surface a generic message for any 5xx.
  const safeMessage = status >= 500 ? 'Unexpected server error' : message
  const details = (err as { details?: unknown }).details
  res.status(status).json({ message: safeMessage, requestId: req.requestId, ...(details ? { details } : {}) })
}
