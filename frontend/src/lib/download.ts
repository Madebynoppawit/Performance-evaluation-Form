import api from './api'
import type { Evaluation } from '@/types'

export type ExportLanguage = 'en' | 'fr'

const PDF_FONT_NAME = 'AMWReport'
const PDF_FONT_URL = '/fonts/AMW-Report-Regular.ttf'

const PDF_COPY: Record<ExportLanguage, Record<string, string>> = {
  en: {
    brand: 'AMW PERFORMANCE EVALUATION',
    confidential: 'CONFIDENTIAL CORPORATE RECORD',
    title: 'Performance Evaluation Report',
    cycleFallback: 'Evaluation Cycle',
    employeeFallback: 'Employee',
    totalScore: 'TOTAL SCORE',
    summary: 'Evaluation Summary',
    employee: 'Employee',
    department: 'Department',
    evaluator: 'Evaluator',
    status: 'Status',
    evaluationType: 'Evaluation Type',
    period: 'Period',
    exportedAt: 'Exported At',
    scores: 'Score Summary',
    goal: 'Goal',
    competency: 'Competency',
    attendance: 'Attendance',
    total: 'Total',
    combinedScore: 'combined score',
    weight: 'weight',
    goals: 'Goals',
    result: 'Result',
    wig: 'WIG',
    kpiCategory: 'KPI Category',
    score: 'Score',
    competencyId: 'Competency ID',
    training: 'Training',
    minimumHours: 'Minimum Hours',
    actualHours: 'Actual Hours',
    percentMinimum: '% vs Minimum',
    behaviorNote: 'Behavior Note',
    comments: 'Comments',
    strengths: 'Strengths',
    improvements: 'Improvements',
    requiredSkills: 'Required Skills',
    metric: 'Metric',
    value: 'Value',
    leaveDays: 'Leave Actual Days',
    lateTimes: 'Late Actual Times',
    disciplinary: 'Disciplinary Level',
    attendanceAvg: 'Attendance Average',
    acknowledgement: 'Acknowledgement',
    signer: 'Signer',
    signedAt: 'Signed At',
    director: 'Director',
    page: 'PAGE',
    of: 'OF',
  },
  fr: {
    brand: 'AMW EVALUATION DE PERFORMANCE',
    confidential: 'DOSSIER CORPORATE CONFIDENTIEL',
    title: "Rapport d'evaluation de performance",
    cycleFallback: "Cycle d'evaluation",
    employeeFallback: 'Collaborateur',
    totalScore: 'SCORE TOTAL',
    summary: "Synthese de l'evaluation",
    employee: 'Collaborateur',
    department: 'Departement',
    evaluator: 'Evaluateur',
    status: 'Statut',
    evaluationType: "Type d'evaluation",
    period: 'Periode',
    exportedAt: 'Exporte le',
    scores: 'Synthese des scores',
    goal: 'Objectif',
    competency: 'Competence',
    attendance: 'Assiduite',
    total: 'Total',
    combinedScore: 'score combine',
    weight: 'ponderation',
    goals: 'Objectifs',
    result: 'Resultat',
    wig: 'WIG',
    kpiCategory: 'Categorie KPI',
    score: 'Score',
    competencyId: 'ID competence',
    training: 'Formation',
    minimumHours: 'Heures minimales',
    actualHours: 'Heures realisees',
    percentMinimum: '% du minimum',
    behaviorNote: 'Note comportementale',
    comments: 'Commentaires',
    strengths: 'Points forts',
    improvements: 'Axes damelioration',
    requiredSkills: 'Competences requises',
    metric: 'Indicateur',
    value: 'Valeur',
    leaveDays: 'Jours de conge',
    lateTimes: 'Retards',
    disciplinary: 'Niveau disciplinaire',
    attendanceAvg: "Moyenne d'assiduite",
    acknowledgement: 'Validation',
    signer: 'Signataire',
    signedAt: 'Signe le',
    director: 'Directeur',
    page: 'PAGE',
    of: 'SUR',
  },
}

async function loadBinaryString(url: string) {
  const res = await fetch(url)
  if (!res.ok) return null
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const signature = String.fromCharCode(...bytes.slice(0, 4))
  const isTrueType = (
    (bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) ||
    signature === 'OTTO' ||
    signature === 'ttcf'
  )
  if (!isTrueType) return null

  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize))
  }
  return binary
}

function filenameFromDisposition(disposition?: string) {
  const match = disposition?.match(/filename="?([^"]+)"?/i)
  return match?.[1]
}

export async function downloadEvaluationExport(evaluationId: string, fallbackName = 'evaluation-export.csv') {
  const res = await api.get(`/reports/evaluations/${evaluationId}/export`, {
    responseType: 'blob',
  })
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filenameFromDisposition(res.headers['content-disposition']) ?? fallbackName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function cleanFilePart(value?: string | null) {
  return (value ?? 'evaluation').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'evaluation'
}

function score(value?: number | null) {
  return value == null ? '-' : value.toFixed(2)
}

function date(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US') : '-'
}

export async function downloadEvaluationPdf(evaluationId: string, fallbackName?: string, language: ExportLanguage = 'en') {
  const [{ jsPDF }, evaluationResponse] = await Promise.all([
    import('jspdf'),
    api.get<Evaluation>(`/evaluations/${evaluationId}`),
  ])
  const ev = evaluationResponse.data
  const copy = PDF_COPY[language]
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let fontFamily = 'helvetica'
  let hasCustomFont = false
  try {
    const font = await loadBinaryString(PDF_FONT_URL)
    if (font) {
      doc.addFileToVFS('AMW-Report-Regular.ttf', font)
      doc.addFont('AMW-Report-Regular.ttf', PDF_FONT_NAME, 'normal')
      fontFamily = PDF_FONT_NAME
      hasCustomFont = true
      doc.setFont(fontFamily, 'normal')
    }
  } catch {
    fontFamily = 'helvetica'
  }
  doc.setLineHeightFactor(1.25)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 42
  const contentWidth = pageWidth - margin * 2
  const navy: [number, number, number] = [41, 37, 82]
  const blue: [number, number, number] = [22, 88, 142]
  const red: [number, number, number] = [237, 28, 36]
  const sky: [number, number, number] = [129, 196, 255]
  const ink: [number, number, number] = [31, 38, 50]
  const muted: [number, number, number] = [99, 111, 128]
  const line: [number, number, number] = [221, 228, 237]
  let y = 46
  const documentId = `AMW-EVAL-${ev.id.slice(0, 8).toUpperCase()}`

  function setPdfFont(style: 'normal' | 'bold' = 'normal') {
    doc.setFont(fontFamily, hasCustomFont ? 'normal' : style)
  }

  function addPageIfNeeded(height = 24) {
    if (y + height <= pageHeight - margin) return
    doc.addPage()
    drawPageChrome()
    y = 72
  }

  function drawPageChrome() {
    doc.setFillColor(...navy)
    doc.rect(0, 0, pageWidth, 10, 'F')
    doc.setFillColor(...blue)
    doc.rect(0, 10, pageWidth * 0.74, 3, 'F')
    doc.setFillColor(...red)
    doc.rect(pageWidth * 0.74, 10, pageWidth * 0.26, 3, 'F')
    doc.setDrawColor(...line)
    doc.line(margin, pageHeight - 34, pageWidth - margin, pageHeight - 34)
    setPdfFont('bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(copy.brand, margin, pageHeight - 18)
    doc.text(`${copy.page} ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 18, { align: 'right' })
    doc.setTextColor(235, 240, 247)
    doc.setFontSize(32)
    doc.text('CONFIDENTIAL', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 35 })
  }

  function sectionTitle(text: string) {
    addPageIfNeeded(42)
    y += 6
    doc.setFillColor(...blue)
    doc.roundedRect(margin, y, 4, 18, 2, 2, 'F')
    setPdfFont('bold')
    doc.setFontSize(12)
    doc.setTextColor(...navy)
    doc.text(text, margin + 12, y + 13)
    y += 28
  }

  function valueRow(label: string, value?: string | number | null, options?: { wide?: boolean }) {
    const width = options?.wide ? contentWidth : (contentWidth - 12) / 2
    const x = options?.wide ? margin : undefined
    return { label, value: String(value ?? '-'), width, x }
  }

  function detailGrid(items: ReturnType<typeof valueRow>[]) {
    const gap = 12
    for (let i = 0; i < items.length; i += 2) {
      const rowItems = items[i].x ? [items[i]] : items.slice(i, i + 2)
      const heights = rowItems.map((item) => {
        const textWidth = item.width - 24
        return Math.max(58, doc.splitTextToSize(item.value, textWidth).length * 11 + 34)
      })
      const cardHeight = Math.max(...heights)
      addPageIfNeeded(cardHeight + 8)
      rowItems.forEach((item, index) => {
        const x = item.x ?? margin + index * (item.width + gap)
        doc.setFillColor(248, 251, 255)
        doc.setDrawColor(...line)
        doc.roundedRect(x, y, item.width, cardHeight, 8, 8, 'FD')
        setPdfFont('bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...muted)
        doc.text(item.label.toUpperCase(), x + 12, y + 18)
        setPdfFont('normal')
        doc.setFontSize(10)
        doc.setTextColor(...ink)
        doc.text(doc.splitTextToSize(item.value, item.width - 24), x + 12, y + 36)
      })
      y += cardHeight + 10
    }
  }

  function scoreCard(label: string, value: string, weight: string, x: number, w: number, accent: [number, number, number]) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...line)
    doc.roundedRect(x, y, w, 82, 10, 10, 'FD')
    doc.setFillColor(...accent)
    doc.roundedRect(x, y, w, 4, 2, 2, 'F')
    setPdfFont('bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(label.toUpperCase(), x + 12, y + 22)
    doc.setFontSize(22)
    doc.setTextColor(...accent)
    doc.text(value, x + 12, y + 51)
    doc.setFontSize(8)
    doc.setTextColor(...muted)
    doc.text(weight, x + 12, y + 68)
  }

  function table(headers: string[], rows: (string | number | null | undefined)[][], widths: number[]) {
    const headerHeight = 24
    addPageIfNeeded(headerHeight + 24)
    doc.setFillColor(...navy)
    doc.roundedRect(margin, y, contentWidth, headerHeight, 6, 6, 'F')
    setPdfFont('bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    let x = margin
    headers.forEach((header, index) => {
      doc.text(header.toUpperCase(), x + 10, y + 15)
      x += widths[index]
    })
    y += headerHeight

    rows.forEach((cells, rowIndex) => {
      const splitCells = cells.map((cell, index) => doc.splitTextToSize(String(cell ?? '-'), widths[index] - 20))
      const rowHeight = Math.max(28, ...splitCells.map((lines) => lines.length * 10 + 16))
      addPageIfNeeded(rowHeight)
      doc.setFillColor(rowIndex % 2 === 0 ? 250 : 255, rowIndex % 2 === 0 ? 252 : 255, 255)
      doc.setDrawColor(...line)
      doc.rect(margin, y, contentWidth, rowHeight, 'FD')
      x = margin
      splitCells.forEach((lines, index) => {
        setPdfFont(index === 0 ? 'bold' : 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...ink)
        doc.text(lines, x + 10, y + 17)
        x += widths[index]
      })
      y += rowHeight
    })
    y += 10
  }

  function banner() {
    doc.setFillColor(...navy)
    doc.roundedRect(margin, y, contentWidth, 118, 14, 14, 'F')
    doc.setFillColor(...blue)
    doc.rect(margin, y, contentWidth * 0.72, 5, 'F')
    doc.setFillColor(...red)
    doc.rect(margin + contentWidth * 0.72, y, contentWidth * 0.28, 5, 'F')
    setPdfFont('normal')
    doc.setFontSize(8)
    doc.setTextColor(...sky)
    doc.text(copy.confidential, margin + 22, y + 30)
    setPdfFont('bold')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.text(copy.title, margin + 22, y + 57)
    doc.setFontSize(11)
    doc.setTextColor(221, 231, 244)
    doc.text(`${ev.evaluatee?.name ?? copy.employeeFallback} - ${ev.cycle?.name ?? copy.cycleFallback}`, margin + 22, y + 79)
    setPdfFont('bold')
    doc.setFontSize(28)
    doc.setTextColor(...sky)
    doc.text(score(ev.totalScore), pageWidth - margin - 22, y + 57, { align: 'right' })
    doc.setFontSize(8)
    doc.setTextColor(221, 231, 244)
    doc.text(copy.totalScore, pageWidth - margin - 22, y + 76, { align: 'right' })
    y += 140
  }

  drawPageChrome()
  banner()

  sectionTitle(copy.summary)
  detailGrid([
    valueRow('Document ID', documentId),
    valueRow('Classification', 'Confidential HR record'),
    valueRow(copy.employee, ev.evaluatee?.name),
    valueRow(copy.department, ev.evaluatee?.department),
    valueRow(copy.evaluator, ev.evaluator?.name),
    valueRow(copy.status, ev.status),
    valueRow(copy.evaluationType, ev.type),
    valueRow(copy.period, `${date(ev.cycle?.startDate)} - ${date(ev.cycle?.endDate)}`),
    valueRow(copy.exportedAt, new Date().toLocaleString('en-US'), { wide: true }),
  ])

  sectionTitle(copy.scores)
  addPageIfNeeded(96)
  const cardW = (contentWidth - 36) / 4
  scoreCard(copy.goal, score(ev.goalScore), `${ev.goalWeight}% ${copy.weight}`, margin, cardW, blue)
  scoreCard(copy.competency, score(ev.competencyScore), `${ev.competencyWeight}% ${copy.weight}`, margin + cardW + 12, cardW, navy)
  scoreCard(copy.attendance, score(ev.attendanceScore), `${ev.attendanceWeight}% ${copy.weight}`, margin + (cardW + 12) * 2, cardW, sky)
  scoreCard(copy.total, score(ev.totalScore), copy.combinedScore, margin + (cardW + 12) * 3, cardW, red)
  y += 98

  if (ev.goalEntries?.length) {
    sectionTitle(copy.goals)
    table(
      [copy.goal, copy.wig, copy.kpiCategory, copy.weight, copy.score],
      ev.goalEntries.map((goal) => [goal.goal, goal.wig ?? '-', goal.kpiCategory ?? '-', `${goal.weight}%`, goal.evaluationScore ?? '-']),
      [170, 110, 130, 70, contentWidth - 480]
    )
  }

  if (ev.competencyScores?.length) {
    sectionTitle(copy.competency)
    table(
      [copy.competencyId, copy.score],
      ev.competencyScores.map((item) => [item.competencyId, item.score ?? '-']),
      [contentWidth - 90, 90]
    )
  }

  if (ev.comment) {
    sectionTitle(copy.comments)
    detailGrid([
      valueRow(copy.strengths, ev.comment.strengths, { wide: true }),
      valueRow(copy.improvements, ev.comment.improvements, { wide: true }),
      valueRow(copy.requiredSkills, ev.comment.requiredSkills, { wide: true }),
    ])
  }

  if (ev.attendanceRecord) {
    sectionTitle(copy.attendance)
    table(
      [copy.metric, copy.value],
      [
        [copy.leaveDays, ev.attendanceRecord.leaveActualDays],
        [copy.lateTimes, ev.attendanceRecord.lateActualTimes],
        [copy.disciplinary, ev.attendanceRecord.disciplinaryLevel],
        [copy.attendanceAvg, score(ev.attendanceRecord.attendanceAvgScore)],
      ],
      [220, contentWidth - 220]
    )
  }

  if (ev.trainingRecord) {
    sectionTitle(copy.training)
    table(
      [copy.metric, copy.value],
      [
        [copy.minimumHours, ev.trainingRecord.minimumHours],
        [copy.actualHours, ev.trainingRecord.actualHours],
        [copy.percentMinimum, ev.trainingRecord.percentOfMinimum == null ? '-' : `${ev.trainingRecord.percentOfMinimum.toFixed(1)}%`],
        [copy.score, ev.trainingRecord.score],
        [copy.behaviorNote, ev.trainingRecord.behaviorNote],
      ],
      [220, contentWidth - 220]
    )
  }

  sectionTitle(copy.acknowledgement)
  table(
    [copy.signer, copy.signedAt],
    [
      [copy.employee, date(ev.acknowledgement?.employeeSignedAt)],
      [copy.evaluator, date(ev.acknowledgement?.evaluatorSignedAt)],
      [copy.director, date(ev.acknowledgement?.directorSignedAt)],
    ],
    [180, contentWidth - 180]
  )

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    setPdfFont('bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(`${copy.page} ${page} ${copy.of} ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: 'right' })
  }

  const name = fallbackName ?? `evaluation-${cleanFilePart(ev.evaluatee?.name)}-${ev.id}.pdf`
  doc.save(name)
}
