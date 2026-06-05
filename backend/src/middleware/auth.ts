import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../lib/prisma'

export interface AuthRequest extends Request {
  user?: { userId: string; role: string }
}

export function canAccessEvaluation(
  user: { userId: string; role: string },
  evaluation: { evaluateeId: string; evaluatorId: string }
) {
  return user.role === 'ADMIN' || evaluation.evaluateeId === user.userId || evaluation.evaluatorId === user.userId
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'ไม่ได้รับอนุญาต' })
    return
  }
  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' })
      return
    }
    next()
  }
}

export async function authorizeEvaluationAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  if (req.user.role === 'ADMIN') {
    next()
    return
  }

  try {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: req.params.id },
      select: { evaluateeId: true, evaluatorId: true },
    })

    if (!evaluation) {
      res.status(404).json({ message: 'Evaluation not found' })
      return
    }

    if (!canAccessEvaluation(req.user, evaluation)) {
      res.status(403).json({ message: 'Forbidden' })
      return
    }

    next()
  } catch (err) {
    next(err)
  }
}
