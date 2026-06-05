import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { reportError } from '../config/monitoring'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const ts     = new Date().toISOString()
  const isZod  = err instanceof ZodError
  const status = isZod ? 400 : ((err as { status?: number }).status ?? 500)

  console.error(JSON.stringify({
    ts,
    level:  'error',
    method: req.method,
    path:   req.path,
    status,
    error:  err instanceof Error
      ? { message: err.message, stack: err.stack?.split('\n').slice(0, 4) }
      : String(err),
  }))

  if (isZod) {
    res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง', errors: err.flatten().fieldErrors })
    return
  }

  // Report unexpected server errors (5xx) to monitoring; skip client 4xx.
  if (status >= 500) reportError(err)

  const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
  res.status(status).json({ message })
}
