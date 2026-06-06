import { Prisma, Role } from '@prisma/client'
import { prisma } from '../lib/prisma'

interface AuditActor {
  userId: string
  role: string
}

export interface AuditEventInput {
  eventType: string
  actor?: AuditActor | null
  requestId?: string
  method?: string
  path?: string
  statusCode?: number
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string | null
}

const ROLES = new Set<string>(Object.values(Role))

export async function recordAuditEvent(input: AuditEventInput) {
  await prisma.auditEvent.create({
    data: {
      eventType: input.eventType,
      actorId: input.actor?.userId,
      actorRole: input.actor && ROLES.has(input.actor.role) ? (input.actor.role as Role) : undefined,
      requestId: input.requestId,
      method: input.method,
      path: input.path,
      statusCode: input.statusCode,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata as Prisma.InputJsonObject | undefined,
      ip: input.ip,
      userAgent: input.userAgent ?? undefined,
    },
  })
}

export function recordAuditEventBestEffort(input: AuditEventInput) {
  if (process.env.NODE_ENV === 'test' && process.env.ENABLE_AUDIT_PERSISTENCE_FOR_TESTS !== 'true') {
    return
  }

  void recordAuditEvent(input).catch((err) => {
    console.warn(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'warn',
      message: 'audit_event_persist_failed',
      requestId: input.requestId,
      eventType: input.eventType,
      error: err instanceof Error ? err.message : String(err),
    }))
  })
}
