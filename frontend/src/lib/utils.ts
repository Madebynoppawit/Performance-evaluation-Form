import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('th-TH', {
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
  DRAFT: 'ร่าง',
  IN_PROGRESS: 'กำลังดำเนินการ',
  SUBMITTED: 'ส่งแล้ว',
  REVIEWED: 'ตรวจสอบแล้ว',
  CLOSED: 'ปิดแล้ว',
}

const CYCLE_STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'กำลังจะมาถึง',
  ACTIVE: 'กำลังดำเนินการ',
  CLOSED: 'ปิดแล้ว',
}

const EVALUATION_TYPE_LABEL: Record<string, string> = {
  SELF: 'ประเมินตนเอง',
  MANAGER: 'ประเมินโดยผู้จัดการ',
  PEER: 'ประเมินโดยเพื่อนร่วมงาน',
  THREE_SIXTY: '360 องศา',
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
