import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { reportError } from '../config/monitoring'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const ts = new Date().toISOString()
  const isZod = err instanceof ZodError
  const status = isZod ? 400 : ((err as { status?: number }).status ?? 500)

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

  const message = err instanceof Error ? err.message : 'Unexpected server error'
  res.status(status).json({ message, requestId: req.requestId })
}
