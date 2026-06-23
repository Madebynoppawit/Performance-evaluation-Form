import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../lib/prisma'
import { Role } from '@prisma/client'
import {
  type Actor,
  type EvaluationPermission,
  canAccessEvaluation,
  isPrivilegedRole,
  isSupervisoryActor,
} from '../security/accessPolicy'

export interface AuthRequest extends Request {
  user?: Actor
}

/** DEVELOPER is a super-role with full system access. ADMIN is HR read-only for evaluations. */
export function isAdminRole(role: Role) {
  return isPrivilegedRole(role)
}

export function isDeveloperRole(role: Role) {
  return role === Role.DEVELOPER
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized', requestId: req.requestId })
    return
  }
  try {
    const token = verifyToken(header.slice(7))
    const actor = await prisma.user.findFirst({
      where: { id: token.userId, deletedAt: null },
      select: { id: true, role: true, position: true, mustChangePassword: true, passwordChangedAt: true },
    })
    if (!actor) {
      res.status(401).json({ message: 'Invalid or expired token', requestId: req.requestId })
      return
    }
    // Invalidate sessions issued before the most recent password change
    // (self-service change or admin reset). JWT `iat` is whole seconds, so
    // floor passwordChangedAt to seconds too — otherwise a token minted in the
    // same second as the change (a legitimate fresh login) is wrongly rejected.
    if (actor.passwordChangedAt && token.iat != null && token.iat < Math.floor(actor.passwordChangedAt.getTime() / 1000)) {
      res.status(401).json({ message: 'Session expired — please sign in again', requestId: req.requestId })
      return
    }
    req.user = { userId: actor.id, role: actor.role, position: actor.position, mustChangePassword: actor.mustChangePassword }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token', requestId: req.requestId })
  }
}

/** Supervisory positions (หัวหน้างานขึ้นไป): Supervisor / Manager / Director-up
    (MD, CEO). They may create evaluations and build templates. Admins/developers
    always allowed. */
export async function authorizeSupervisory(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized', requestId: req.requestId })
    return
  }
  if (isSupervisoryActor(req.user)) {
    next()
    return
  }
  res.status(403).json({
    message: 'Only supervisors, managers or directors can perform this action',
    requestId: req.requestId,
  })
}

/** Block data access while the account is still on its initial/default password.
    The only thing such a user may do is change their password (PATCH /auth/me),
    which is on the un-gated /auth router. This makes the `mustChangePassword`
    flag a real server-side control rather than an advisory the client can ignore. */
export function blockIfPasswordChangeRequired(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    res.status(403).json({
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'You must change your password before continuing.',
      requestId: req.requestId,
    })
    return
  }
  next()
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // DEVELOPER passes every role gate; admins pass any ADMIN-or-lower gate.
    if (!req.user || !(roles.includes(req.user.role) || req.user.role === Role.DEVELOPER)) {
      res.status(403).json({ message: 'Forbidden', requestId: req.requestId })
      return
    }
    next()
  }
}

export function authorizeEvaluation(permission: EvaluationPermission) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized', requestId: req.requestId })
      return
    }

    try {
      const evaluation = await prisma.evaluation.findFirst({
        where: { id: req.params.id, deletedAt: null },
        select: { evaluateeId: true, evaluatorId: true, reviewerId: true },
      })

      if (!evaluation) {
        res.status(404).json({ message: 'Evaluation not found', requestId: req.requestId })
        return
      }

      if (!canAccessEvaluation(req.user, evaluation, permission)) {
        res.status(403).json({ message: 'Forbidden', requestId: req.requestId })
        return
      }

      next()
    } catch (err) {
      next(err)
    }
  }
}
