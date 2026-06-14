import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/features/auth/authStore'
import type { Evaluation } from '@/types'

export interface AppNotification {
  id: string
  title: string
  description: string
  time: string
  type: 'approval' | 'deadline' | 'system'
  href: string
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

export function useNotifications() {
  const user = useAuthStore(s => s.user)

  const { data: evaluations = [] } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: () => api.get('/evaluations').then(r => r.data),
    staleTime: 2 * 60_000,
    enabled: !!user,
  })

  const notifications = useMemo<AppNotification[]>(() => {
    if (!user) return []
    const items: AppNotification[] = []

    // ── Approval: evaluations waiting for the current user to act ──────────
    for (const ev of evaluations) {
      const name = ev.evaluatee?.name ?? 'Employee'

      // Admin/developer performs 2nd-stage review (no dedicated reviewerId field)
      if (ev.status === 'PENDING_REVIEW' && (user.role === 'ADMIN' || user.role === 'DEVELOPER')) {
        items.push({
          id: `review-${ev.id}`,
          title: `Review pending for ${name}`,
          description: 'This evaluation is waiting for your second-stage review.',
          time: relativeTime(ev.updatedAt),
          type: 'approval',
          href: `/evaluations/${ev.id}`,
        })
      }

      // Employee needs to acknowledge their own reviewed evaluation
      if (ev.status === 'REVIEWED' && ev.evaluateeId === user.id) {
        items.push({
          id: `ack-${ev.id}`,
          title: `Your evaluation is ready`,
          description: `${ev.cycle?.name ?? 'Evaluation'} — please review and acknowledge your results.`,
          time: relativeTime(ev.updatedAt),
          type: 'approval',
          href: `/evaluations/${ev.id}`,
        })
      }

      // Evaluator: their draft has been in-progress for > 3 days
      if (
        ev.status === 'IN_PROGRESS' &&
        ev.evaluatorId === user.id &&
        Date.now() - new Date(ev.updatedAt).getTime() > 3 * 86_400_000
      ) {
        items.push({
          id: `stale-${ev.id}`,
          title: `Stale evaluation: ${name}`,
          description: 'This evaluation has not been updated in 3+ days.',
          time: relativeTime(ev.updatedAt),
          type: 'approval',
          href: `/evaluations/${ev.id}`,
        })
      }
    }

    // ── Deadline: active cycles closing within 7 days ──────────────────────
    const seenCycles = new Set<string>()
    for (const ev of evaluations) {
      const cycle = ev.cycle
      if (!cycle || cycle.status !== 'ACTIVE' || seenCycles.has(cycle.id)) continue
      seenCycles.add(cycle.id)
      const days = daysUntil(cycle.endDate)
      if (days >= 0 && days <= 7) {
        items.push({
          id: `deadline-${cycle.id}`,
          title: `Cycle closes in ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'}`}`,
          description: `${cycle.name} — complete remaining evaluations before the window closes.`,
          time: new Date(cycle.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          type: 'deadline',
          href: '/evaluations',
        })
      }
    }

    // Limit total to 10 most recent
    return items.slice(0, 10)
  }, [evaluations, user])

  const unreadCount = notifications.length

  return { notifications, unreadCount }
}
