import { Position, Role } from '@prisma/client'

export const PRIVILEGED_ROLES = new Set<Role>([Role.DEVELOPER, Role.ADMIN])
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
    return actor.role === Role.MANAGER && evaluation.evaluatorId === actor.userId
  }

  return actor.role === Role.MANAGER
    && (evaluation.evaluatorId === actor.userId || evaluation.reviewerId === actor.userId)
}

export function canIncludeSalary(actor: Actor, evaluation: EvaluationAccess) {
  return actor.role === Role.DEVELOPER
    || actor.role === Role.ADMIN
    || (actor.role === Role.MANAGER
      && (evaluation.evaluatorId === actor.userId || evaluation.reviewerId === actor.userId))
}
