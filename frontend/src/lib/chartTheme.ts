import type { CSSProperties } from 'react'

export const chartColor = {
  textMuted: 'var(--kbt-text-3)',
  primary: 'var(--sap-blue)',
  primarySoft: 'rgba(10,110,209,0.06)',
  primaryCursor: 'rgba(10,110,209,0.3)',
  reference: 'rgba(129,196,255,0.45)',
  benchmark: 'rgba(216,160,22,0.5)',
  grid: 'rgba(137,145,154,0.18)',
  success: 'var(--kbt-success)',
  warning: 'var(--kbt-warning)',
  gold: 'var(--lambo-gold)',
  silver: '#cfd8e3',
  bronze: '#d8a016',
  ink: '#0a0a0a',
} as const

export const chartTick = {
  sm: { fontSize: 10, fill: chartColor.textMuted },
  md: { fontSize: 11, fill: chartColor.textMuted },
} as const

export const chartMargin = {
  compact: { top: 4, right: 8, left: -22, bottom: 0 },
  report: { top: 0, right: 4, left: -20, bottom: 0 },
} as const

export const chartStroke = {
  dash: '3 3',
  gridDash: '2 4',
} as const

export const chartMotion: CSSProperties = {
  transition: 'stroke-dashoffset var(--transition-med)',
}

export const statusTone = {
  DRAFT: { label: 'Draft', color: 'rgba(168,183,204,0.5)' },
  IN_PROGRESS: { label: 'In Progress', color: '#f59e0b' },
  SUBMITTED: { label: 'Submitted', color: 'var(--sap-blue)' },
  REVIEWED: { label: 'Reviewed', color: '#22c55e' },
  CLOSED: { label: 'Closed', color: 'var(--m-light-blue)' },
} as const

export const performerTone = {
  top: 'linear-gradient(135deg,var(--sap-blue),#22c55e)',
  attention: 'linear-gradient(135deg,#f59e0b,var(--amw-red))',
} as const

