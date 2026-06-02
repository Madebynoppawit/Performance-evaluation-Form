import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง', errors: err.flatten().fieldErrors })
    return
  }
  console.error(err)
  const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
  res.status(500).json({ message })
}
