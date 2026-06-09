import api from './api'
import type { Evaluation } from '@/types'
import { EVALUATION_REASONS, getFormDefinition, scoreToGrade } from '@/features/evaluations/constants/formDefinitions'

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
    position: 'Position',
    hireDate: 'Hire Date',
    evaluator: 'Evaluator',
    evaluatorTitle: 'Evaluator Title',
    status: 'Status',
    evaluationType: 'Evaluation Type',
    form: 'Form',
    reason: 'Reason',
    grade: 'Performance Grade',
    effectiveDate: 'Effective Date',
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
    description: 'Description',
    target: 'Target',
    result: 'Result',
    wig: 'WIG',
    kpiCategory: 'KPI Category',
    score: 'Score',
    competencyId: 'Competency ID',
    criteria: 'Criteria',
    category: 'Category',
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
    salary: 'Salary / Compensation',
    oldSalary: 'Old Salary',
    newSalary: 'New Salary',
    bonus: 'Bonus',
    bonusDeduction: 'Bonus Deduction',
    bonusPolicy: 'Bonus Policy',
    answers: 'Saved Template Answers',
    question: 'Question',
    answer: 'Answer',
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
    position: 'Poste',
    hireDate: "Date d'embauche",
    evaluator: 'Evaluateur',
    evaluatorTitle: "Titre de l'evaluateur",
    status: 'Statut',
    evaluationType: "Type d'evaluation",
    form: 'Formulaire',
    reason: 'Motif',
    grade: 'Note de performance',
    effectiveDate: "Date d'effet",
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
    description: 'Description',
    target: 'Objectif',
    result: 'Resultat',
    wig: 'WIG',
    kpiCategory: 'Categorie KPI',
    score: 'Score',
    competencyId: 'ID competence',
    criteria: 'Critere',
    category: 'Categorie',
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
    salary: 'Salaire / Compensation',
    oldSalary: 'Ancien salaire',
    newSalary: 'Nouveau salaire',
    bonus: 'Prime',
    bonusDeduction: 'Deduction de prime',
    bonusPolicy: 'Politique de prime',
    answers: 'Reponses du modele',
    question: 'Question',
    answer: 'Reponse',
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

function money(value?: number | null) {
  return value == null ? '-' : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function reasonLabel(value?: string | null) {
  const item = EVALUATION_REASONS.find((reason) => reason.value === value)
  return item?.en ?? value ?? '-'
}

export async function downloadEvaluationPdf(evaluationId: string, fallbackName?: string, language: ExportLanguage = 'en') {
  const [{ jsPDF }, evaluationResponse] = await Promise.all([
    import('jspdf'),
    api.get<Evaluation>(`/evaluations/${evaluationId}`),
  ])
  const ev = evaluationResponse.data
  const copy = PDF_COPY[language]
  const formDef = getFormDefinition(ev.formType)
  const scoreById = new Map((ev.competencyScores ?? []).map((item) => [item.competencyId, item.score]))
  const displayEmployee = ev.evaluateeName?.trim() || ev.evaluatee?.name || copy.employeeFallback
  const displayEvaluator = ev.evaluatorName?.trim() || ev.evaluator?.name || '-'
  const displayPosition = ev.evaluatee?.jobTitle?.trim() || ev.evaluatee?.position || '-'
  const selectedGrade = ev.performanceGrade
    ? formDef.gradeScale.find((grade) => grade.key === ev.performanceGrade)
    : null
  const ratedCriteria = formDef.categories.flatMap((category) => category.criteria)
    .map((criterion) => scoreById.get(criterion.id))
    .filter((item): item is number => item != null)
  const calculatedGrade = ratedCriteria.length
    ? scoreToGrade(ratedCriteria.reduce((sum, item) => sum + item, 0) / ratedCriteria.length, formDef)
    : null
  const performanceGrade = selectedGrade ?? calculatedGrade
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
  const paper: [number, number, number] = [248, 251, 255]
  const gold: [number, number, number] = [184, 151, 87]
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
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')
    doc.setFillColor(...navy)
    doc.rect(0, 0, pageWidth, 8, 'F')
    doc.setFillColor(...blue)
    doc.rect(0, 8, pageWidth * 0.74, 3, 'F')
    doc.setFillColor(...red)
    doc.rect(pageWidth * 0.74, 8, pageWidth * 0.26, 3, 'F')
    doc.setFillColor(...paper)
    doc.rect(0, pageHeight - 44, pageWidth, 44, 'F')
    doc.setDrawColor(...line)
    doc.line(margin, pageHeight - 34, pageWidth - margin, pageHeight - 34)
    setPdfFont('bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(copy.brand, margin, pageHeight - 18)
    doc.text(documentId, pageWidth / 2, pageHeight - 18, { align: 'center' })
    doc.text(`${copy.page} ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 18, { align: 'right' })
    doc.setTextColor(244, 247, 252)
    doc.setFontSize(28)
    doc.text('CONFIDENTIAL', pageWidth / 2, pageHeight / 2 + 18, { align: 'center', angle: 35 })
  }

  function sectionTitle(text: string) {
    addPageIfNeeded(50)
    y += 8
    doc.setDrawColor(...line)
    doc.line(margin, y + 23, pageWidth - margin, y + 23)
    doc.setFillColor(...navy)
    doc.roundedRect(margin, y, 24, 24, 6, 6, 'F')
    doc.setFillColor(...gold)
    doc.circle(margin + 12, y + 12, 3.5, 'F')
    setPdfFont('bold')
    doc.setFontSize(11.5)
    doc.setTextColor(...navy)
    doc.text(text.toUpperCase(), margin + 34, y + 16)
    y += 38
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
        doc.setFillColor(...paper)
        doc.setDrawColor(...line)
        doc.roundedRect(x, y, item.width, cardHeight, 7, 7, 'FD')
        doc.setFillColor(...blue)
        doc.roundedRect(x, y, 4, cardHeight, 2, 2, 'F')
        setPdfFont('bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...blue)
        doc.text(item.label.toUpperCase(), x + 16, y + 18)
        setPdfFont('normal')
        doc.setFontSize(9.6)
        doc.setTextColor(...ink)
        doc.text(doc.splitTextToSize(item.value, item.width - 30), x + 16, y + 37)
      })
      y += cardHeight + 10
    }
  }

  function scoreCard(label: string, value: string, weight: string, x: number, w: number, accent: [number, number, number]) {
    doc.setFillColor(...paper)
    doc.setDrawColor(...line)
    doc.roundedRect(x, y, w, 86, 10, 10, 'FD')
    doc.setFillColor(...accent)
    doc.roundedRect(x, y, w, 5, 2, 2, 'F')
    doc.setFillColor(255, 255, 255)
    doc.circle(x + w - 20, y + 23, 8, 'F')
    setPdfFont('bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(label.toUpperCase(), x + 12, y + 22)
    doc.setFontSize(24)
    doc.setTextColor(...accent)
    doc.text(value, x + 12, y + 54)
    doc.setFontSize(8)
    doc.setTextColor(...muted)
    doc.text(weight, x + 12, y + 72)
  }

  function table(headers: string[], rows: (string | number | null | undefined)[][], widths: number[]) {
    const headerHeight = 28
    addPageIfNeeded(headerHeight + 24)
    doc.setFillColor(...navy)
    doc.roundedRect(margin, y, contentWidth, headerHeight, 7, 7, 'F')
    doc.setFillColor(...blue)
    doc.rect(margin, y + headerHeight - 3, contentWidth * 0.78, 3, 'F')
    doc.setFillColor(...red)
    doc.rect(margin + contentWidth * 0.78, y + headerHeight - 3, contentWidth * 0.22, 3, 'F')
    setPdfFont('bold')
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    let x = margin
    headers.forEach((header, index) => {
      doc.text(header.toUpperCase(), x + 10, y + 17)
      x += widths[index]
    })
    y += headerHeight

    rows.forEach((cells, rowIndex) => {
      const splitCells = cells.map((cell, index) => doc.splitTextToSize(String(cell ?? '-'), widths[index] - 20))
      const rowHeight = Math.max(32, ...splitCells.map((lines) => lines.length * 10 + 18))
      addPageIfNeeded(rowHeight)
      doc.setFillColor(rowIndex % 2 === 0 ? paper[0] : 255, rowIndex % 2 === 0 ? paper[1] : 255, rowIndex % 2 === 0 ? paper[2] : 255)
      doc.setDrawColor(226, 233, 242)
      doc.rect(margin, y, contentWidth, rowHeight, 'FD')
      x = margin
      splitCells.forEach((lines, index) => {
        setPdfFont(index === 0 ? 'bold' : 'normal')
        doc.setFontSize(8.2)
        doc.setTextColor(...ink)
        doc.text(lines, x + 10, y + 18)
        x += widths[index]
      })
      y += rowHeight
    })
    y += 10
  }

  function banner() {
    doc.setFillColor(...navy)
    doc.roundedRect(margin, y, contentWidth, 138, 16, 16, 'F')
    doc.setFillColor(...blue)
    doc.rect(margin, y, contentWidth * 0.72, 6, 'F')
    doc.setFillColor(...red)
    doc.rect(margin + contentWidth * 0.72, y, contentWidth * 0.28, 6, 'F')
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin + 22, y + 24, 58, 34, 8, 8, 'F')
    setPdfFont('bold')
    doc.setFontSize(14)
    doc.setTextColor(...navy)
    doc.text('AMW', margin + 51, y + 46, { align: 'center' })
    setPdfFont('normal')
    doc.setFontSize(8)
    doc.setTextColor(...sky)
    doc.text(copy.confidential, margin + 94, y + 34)
    setPdfFont('bold')
    doc.setFontSize(21)
    doc.setTextColor(255, 255, 255)
    doc.text(copy.title, margin + 94, y + 58)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(79, 119, 168)
    doc.roundedRect(pageWidth - margin - 116, y + 26, 94, 82, 12, 12, 'FD')
    doc.setFontSize(27)
    doc.setTextColor(...red)
    doc.text(score(ev.totalScore), pageWidth - margin - 69, y + 64, { align: 'center' })
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(copy.totalScore, pageWidth - margin - 69, y + 84, { align: 'center' })
    doc.setFontSize(10)
    doc.setTextColor(221, 231, 244)
    doc.text(doc.splitTextToSize(`${displayEmployee} / ${ev.cycle?.name ?? copy.cycleFallback}`, contentWidth - 150), margin + 94, y + 79)
    setPdfFont('normal')
    doc.setFontSize(8.5)
    doc.setTextColor(221, 231, 244)
    doc.text(`${documentId}  |  ${new Date().toLocaleDateString('en-US')}`, margin + 94, y + 115)
    y += 160
  }

  drawPageChrome()
  banner()

  sectionTitle(copy.summary)
  detailGrid([
    valueRow('Document ID', documentId),
    valueRow('Classification', 'Confidential HR record'),
    valueRow(copy.employee, displayEmployee),
    valueRow(copy.department, ev.evaluatee?.department),
    valueRow(copy.position, displayPosition),
    valueRow(copy.hireDate, date(ev.evaluatee?.hireDate)),
    valueRow(copy.evaluator, displayEvaluator),
    valueRow(copy.evaluatorTitle, ev.evaluatorTitle),
    valueRow(copy.status, ev.status),
    valueRow(copy.evaluationType, ev.type),
    valueRow(copy.form, `${formDef.code} - ${formDef.titleEn}`, { wide: true }),
    valueRow(copy.reason, ev.evaluationReason === 'OTHER' ? ev.evaluationReasonOther : reasonLabel(ev.evaluationReason)),
    valueRow(copy.grade, performanceGrade?.en ?? '-'),
    valueRow(copy.effectiveDate, date(ev.effectiveDate)),
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
      [copy.goal, copy.description, copy.wig, copy.kpiCategory, copy.weight, copy.score],
      ev.goalEntries.map((goal) => [goal.goal, goal.goalDescription ?? '-', goal.wig ?? '-', goal.kpiCategory ?? '-', `${goal.weight}%`, goal.evaluationScore ?? '-']),
      [110, 150, 78, 92, 52, contentWidth - 482]
    )
    table(
      [copy.goal, `${copy.target} 5`, `${copy.target} 4`, `${copy.target} 3`, `${copy.target} 2`, `${copy.target} 1`, copy.result],
      ev.goalEntries.map((goal) => [goal.goal, goal.targetRating5, goal.targetRating4, goal.targetRating3, goal.targetRating2, goal.targetRating1, goal.result]),
      [110, 58, 58, 58, 58, 58, contentWidth - 400]
    )
    table(
      [copy.goal, 'Employee Comment', 'Superior Comment'],
      ev.goalEntries.map((goal) => [goal.goal, goal.employeeComment, goal.superiorComment]),
      [120, (contentWidth - 120) / 2, (contentWidth - 120) / 2]
    )
  }

  if (ev.competencyScores?.length) {
    sectionTitle(copy.competency)
    table(
      [copy.category, copy.competencyId, copy.criteria, copy.score],
      formDef.categories.flatMap((category) =>
        category.criteria.map((criterion) => [
          `${category.num}. ${category.titleEn}`,
          criterion.id,
          criterion.en,
          scoreById.get(criterion.id) ?? '-',
        ])
      ),
      [108, 48, contentWidth - 216, 60]
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

  if (ev.salarySummary) {
    sectionTitle(copy.salary)
    detailGrid([
      valueRow(copy.oldSalary, money(ev.salarySummary.oldSalary)),
      valueRow(copy.newSalary, money(ev.salarySummary.newSalary)),
      valueRow(copy.bonus, money(ev.salarySummary.bonus)),
      valueRow(copy.bonusDeduction, money(ev.salarySummary.bonusDeduction)),
      valueRow(copy.effectiveDate, date(ev.salarySummary.effectiveDate)),
      valueRow(copy.bonusPolicy, ev.salarySummary.bonusPolicy, { wide: true }),
    ])
  }

  if (ev.answers?.length) {
    sectionTitle(copy.answers)
    table(
      [copy.question, copy.answer, copy.score],
      ev.answers.map((answer) => [answer.questionId, answer.value, answer.score ?? '-']),
      [contentWidth * 0.42, contentWidth * 0.42, contentWidth * 0.16]
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

  const name = fallbackName ?? `evaluation-${cleanFilePart(displayEmployee)}-${ev.id}.pdf`
  doc.save(name)
}
