import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatScore(score?: number | null) {
  if (score == null) return '-'
  return score.toFixed(2)
}

const EVALUATION_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
  CLOSED: 'Closed',
}

const CYCLE_STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'Upcoming',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
}

const EVALUATION_TYPE_LABEL: Record<string, string> = {
  SELF: 'Self Review',
  MANAGER: 'Manager Review',
  PEER: 'Peer Review',
  THREE_SIXTY: '360 Review',
}

export function getStatusLabel(status: string) {
  return EVALUATION_STATUS_LABEL[status] ?? status
}

export function getCycleStatusLabel(status: string) {
  return CYCLE_STATUS_LABEL[status] ?? status
}

export function getTypeLabel(type: string) {
  return EVALUATION_TYPE_LABEL[type] ?? type
}
