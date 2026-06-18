import { Position, Role } from '@prisma/client'

export const PRIVILEGED_ROLES = new Set<Role>([Role.DEVELOPER, Role.ADMIN])

/** Roles that carry manager-level access: can create cycles, view reports, manage evaluations. */
export const MANAGER_LIKE_ROLES = new Set<Role>([
  Role.MANAGER, Role.MANAGING_DIRECTOR, Role.DIRECTOR, Role.SUPERVISOR,
])

/** Shorthand list for requireRole() calls that open routes to any manager-like role. */
export const MANAGER_GATES = [
  Role.ADMIN, Role.MANAGER, Role.MANAGING_DIRECTOR, Role.DIRECTOR, Role.SUPERVISOR,
] as const

export const SUPERVISORY_POSITIONS = new Set<Position>([
  Position.CEO,
  Position.MANAGING_DIRECTOR,
  Position.DIRECTOR_UP,
  Position.MANAGER,
  Position.SUPERVISOR,
])

export type Actor = {
  userId: string
  role: Role
  position: Position | null
  mustChangePassword?: boolean
}

export type EvaluationAccess = {
  evaluateeId: string
  evaluatorId: string
  reviewerId: string | null
}

export type EvaluationPermission =
  | 'read'
  | 'edit'
  | 'review'
  | 'salary'
  | 'acknowledgement'

export function isPrivilegedRole(role: Role) {
  return PRIVILEGED_ROLES.has(role)
}

export function isSupervisoryActor(actor: Actor) {
  return isPrivilegedRole(actor.role)
    || (actor.position != null && SUPERVISORY_POSITIONS.has(actor.position))
}

export function canAccessEvaluation(
  actor: Actor,
  evaluation: EvaluationAccess,
  permission: EvaluationPermission,
) {
  if (actor.role === Role.DEVELOPER) return true

  if (permission === 'read') {
    return actor.role === Role.ADMIN
      || evaluation.evaluateeId === actor.userId
      || evaluation.evaluatorId === actor.userId
      || evaluation.reviewerId === actor.userId
  }

  if (actor.role === Role.ADMIN) return false

  if (permission === 'edit') {
    return evaluation.evaluatorId === actor.userId
  }

  if (permission === 'review') {
    return evaluation.reviewerId === actor.userId
  }

  if (permission === 'salary') {
    return MANAGER_LIKE_ROLES.has(actor.role) && evaluation.evaluatorId === actor.userId
  }

  return MANAGER_LIKE_ROLES.has(actor.role)
    && (evaluation.evaluatorId === actor.userId || evaluation.reviewerId === actor.userId)
}

export function canIncludeSalary(actor: Actor, evaluation: EvaluationAccess) {
  return actor.role === Role.DEVELOPER
    || actor.role === Role.ADMIN
    || (MANAGER_LIKE_ROLES.has(actor.role)
      && (evaluation.evaluatorId === actor.userId || evaluation.reviewerId === actor.userId))
}
