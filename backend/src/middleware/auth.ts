import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../lib/prisma'

export interface AuthRequest extends Request {
  user?: { userId: string; role: string }
}

/** DEVELOPER is a super-role that has the full control of ADMIN (and above). */
export function isAdminRole(role: string) {
  return role === 'ADMIN' || role === 'DEVELOPER'
}

export function canAccessEvaluation(
  user: { userId: string; role: string },
  evaluation: { evaluateeId: string; evaluatorId: string }
) {
  return isAdminRole(user.role) || evaluation.evaluateeId === user.userId || evaluation.evaluatorId === user.userId
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized', requestId: req.requestId })
    return
  }
  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token', requestId: req.requestId })
  }
}

/** Supervisory positions (หัวหน้างานขึ้นไป): Supervisor / Manager / Director-up
    (MD, CEO). They may create evaluations and build templates. Admins/developers
    always allowed. */
const SUPERVISORY_POSITIONS = ['CEO', 'MANAGING_DIRECTOR', 'DIRECTOR_UP', 'MANAGER', 'SUPERVISOR']

export async function authorizeSupervisory(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized', requestId: req.requestId })
    return
  }
  if (isAdminRole(req.user.role)) {
    next()
    return
  }
  try {
    const actor = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { position: true },
    })
    if (actor?.position && SUPERVISORY_POSITIONS.includes(actor.position)) {
      next()
      return
    }
    res.status(403).json({
      message: 'Only supervisors, managers or directors can perform this action',
      requestId: req.requestId,
    })
  } catch (err) {
    next(err)
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // DEVELOPER passes every role gate; admins pass any ADMIN-or-lower gate.
    if (!req.user || !(roles.includes(req.user.role) || req.user.role === 'DEVELOPER')) {
      res.status(403).json({ message: 'Forbidden', requestId: req.requestId })
      return
    }
    next()
  }
}

export async function authorizeEvaluationAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized', requestId: req.requestId })
    return
  }

  if (isAdminRole(req.user.role)) {
    next()
    return
  }

  try {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: req.params.id },
      select: { evaluateeId: true, evaluatorId: true },
    })

    if (!evaluation) {
      res.status(404).json({ message: 'Evaluation not found', requestId: req.requestId })
      return
    }

    if (!canAccessEvaluation(req.user, evaluation)) {
      res.status(403).json({ message: 'Forbidden', requestId: req.requestId })
      return
    }

    next()
  } catch (err) {
    next(err)
  }
}
