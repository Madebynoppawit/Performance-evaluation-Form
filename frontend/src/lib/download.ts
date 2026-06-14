import api from './api'
import type { Evaluation } from '@/types'
import { getFormDefinition } from '@/features/evaluations/constants/formDefinitions'
import { COMPETENCY_DEFINITIONS, RATING_SCALE as CC_RATING_SCALE } from '@/features/evaluations/constants/competency'
import type { Position } from '@/types'

export type ExportLanguage = 'en' | 'fr'

const PDF_FONT_NAME = 'AMWReport'
const PDF_FONT_URL = '/fonts/AMW-Report-Regular.ttf'

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

function fmtDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-GB') : '—'
}

function fmtScore(value?: number | null) {
  return value == null ? '—' : value.toFixed(2)
}

type RGB = [number, number, number]

export async function downloadEvaluationPdf(evaluationId: string, fallbackName?: string, _language: ExportLanguage = 'en') {
  void _language
  const [{ jsPDF }, evaluationResponse] = await Promise.all([
    import('jspdf'),
    api.get<Evaluation>(`/evaluations/${evaluationId}`),
  ])
  const ev = evaluationResponse.data
  const formDef = getFormDefinition(ev.formType)
  const isWeighted = formDef.sections.goalSetting
  const scoreById = new Map((ev.competencyScores ?? []).map(s => [s.competencyId, s.score]))

  const displayEmployee = ev.evaluateeName?.trim() || ev.evaluatee?.name || 'Employee'
  const displayEvaluator = ev.evaluatorName?.trim() || ev.evaluator?.name || '—'
  const displayPosition = ev.evaluatee?.jobTitle?.trim() || (ev.evaluatee?.position ?? '—')
  const displayDept = ev.evaluatee?.department || '—'
  const documentId = `AMW-${ev.id.slice(0, 8).toUpperCase()}`

  const goals = ev.goalEntries ?? []
  const trainingScore = ev.trainingRecord?.score ?? null
  const attRecord = ev.attendanceRecord ?? null
  const attScore = attRecord?.attendanceAvgScore ?? ev.attendanceScore ?? null
  const goalScore = ev.goalScore ?? null
  const competencyScore = ev.competencyScore ?? null

  const TRAINING_WEIGHT = 10
  const effectiveTrainingWeight = trainingScore != null ? TRAINING_WEIGHT : 0
  const cWeight = ev.competencyWeight || 20
  const aWeight = ev.attendanceWeight || 10
  const effectiveGoalWeight = isWeighted ? (100 - cWeight - aWeight - effectiveTrainingWeight) : 0

  let weightedTotal: number | null = null
  if (isWeighted && goalScore != null && competencyScore != null && attScore != null) {
    weightedTotal = (
      goalScore * effectiveGoalWeight +
      competencyScore * cWeight +
      attScore * aWeight +
      (trainingScore ?? 0) * effectiveTrainingWeight
    ) / 100
  }

  const allOseCriteria = formDef.categories.flatMap(c => c.criteria)
  const oseScoredValues = allOseCriteria.map(c => scoreById.get(c.id)).filter((s): s is number => s != null)
  const oseAvg = oseScoredValues.length ? oseScoredValues.reduce((a, b) => a + b, 0) / oseScoredValues.length : null
  const oseGrade = oseAvg != null ? formDef.gradeScale.find(g => g.value === Math.round(oseAvg)) ?? null : null

  const calibGrade = weightedTotal != null
    ? CC_RATING_SCALE.find(r => r.score === Math.round(weightedTotal!)) ?? CC_RATING_SCALE[CC_RATING_SCALE.length - 1]
    : null

  const positionCompetencies = ev.evaluatee?.position
    ? COMPETENCY_DEFINITIONS.filter(c => c.positions.includes(ev.evaluatee!.position as Position))
    : []

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  // AMWReport only covers Thai codepoints (U+0E01–U+0E4E); use it for Thai
  // section headings and fall back to helvetica for all Latin / numeric content.
  let thaiFont = 'helvetica'
  try {
    const font = await loadBinaryString(PDF_FONT_URL)
    if (font) {
      doc.addFileToVFS('AMW-Report-Regular.ttf', font)
      doc.addFont('AMW-Report-Regular.ttf', PDF_FONT_NAME, 'normal')
      thaiFont = PDF_FONT_NAME
    }
  } catch { /* stay with helvetica */ }

  const PW = doc.internal.pageSize.getWidth()
  const PH = doc.internal.pageSize.getHeight()
  const M = 36
  const CW = PW - M * 2

  const C = {
    navy:    [31, 57, 97]     as RGB,
    blue:    [46, 99, 166]    as RGB,
    blueLt:  [215, 228, 250]  as RGB,
    red:     [229, 35, 33]    as RGB,
    orange:  [234, 122, 0]    as RGB,
    ink:     [22, 26, 36]     as RGB,
    muted:   [100, 115, 135]  as RGB,
    border:  [175, 188, 205]  as RGB,
    borderX: [210, 220, 232]  as RGB,
    paper:   [249, 251, 255]  as RGB,
    rowAlt:  [242, 246, 254]  as RGB,
    white:   [255, 255, 255]  as RGB,
    green:   [22, 163, 74]    as RGB,
    amber:   [210, 115, 6]    as RGB,
  }

  const SCORE_BG: Record<number, RGB> = {
    5: C.navy, 4: C.blue, 3: C.green, 2: C.amber, 1: C.red,
  }

  let y = M

  // pf  → helvetica (supports all Latin/numeric content)
  function pf(bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
  }
  // pfTh → Thai font for section headings that contain Thai text
  function pfTh() {
    doc.setFont(thaiFont, 'normal')
  }

  function needPage(h = 24) {
    if (y + h > PH - M - 24) {
      doc.addPage()
      renderPageFrame()
      y = M + 44
    }
  }

  function renderPageFrame() {
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, PW, PH, 'F')
    doc.setFillColor(...C.navy)
    doc.rect(0, 0, PW, 6, 'F')
    doc.setFillColor(...C.blue)
    doc.rect(0, 6, PW * 0.72, 2, 'F')
    doc.setFillColor(...C.red)
    doc.rect(PW * 0.72, 6, PW * 0.28, 2, 'F')
    doc.setFillColor(...C.paper)
    doc.rect(0, 8, PW, 32, 'F')
    doc.setDrawColor(...C.borderX)
    doc.line(M, 38, PW - M, 38)
    pf(true)
    doc.setFontSize(7)
    doc.setTextColor(...C.navy)
    doc.text('AMW', M, 27)
    doc.setTextColor(...C.muted)
    doc.setFontSize(6.5)
    doc.text('Performance Evaluation System', M + 20, 27)
    doc.setTextColor(...C.ink)
    doc.setFontSize(7)
    doc.text(displayEmployee, PW / 2, 27, { align: 'center' })
    doc.setTextColor(...C.muted)
    doc.setFontSize(6.5)
    doc.text(documentId, PW - M, 27, { align: 'right' })
    doc.setFontSize(24)
    doc.setTextColor(238, 242, 250)
    doc.text('CONFIDENTIAL', PW / 2, PH / 2 + 20, { align: 'center', angle: 35 })
    doc.setFillColor(...C.paper)
    doc.rect(0, PH - 26, PW, 26, 'F')
    doc.setDrawColor(...C.borderX)
    doc.line(M, PH - 20, PW - M, PH - 20)
    pf(false)
    doc.setFontSize(6.5)
    doc.setTextColor(...C.muted)
    doc.text(`${formDef.code} · ${formDef.titleEn}`, M, PH - 8)
  }

  function partBanner(num: string, titleTh: string, titleEn: string) {
    needPage(26)
    doc.setFillColor(...C.navy)
    doc.rect(M, y, CW, 22, 'F')
    doc.setFillColor(...C.blue)
    doc.rect(M, y + 19, CW * 0.68, 3, 'F')
    doc.setFillColor(...C.red)
    doc.rect(M + CW * 0.68, y + 19, CW * 0.32, 3, 'F')
    pfTh()
    doc.setFontSize(7.5)
    doc.setTextColor(...C.white)
    doc.text(`${num}   ${titleTh}  /  ${titleEn}`, M + 10, y + 14)
    y += 22
  }

  function colDivider(x: number, top: number, h: number) {
    doc.setDrawColor(...C.borderX)
    doc.line(x, top, x, top + h)
  }

  function cellText(
    text: string,
    x: number,
    cellY: number,
    w: number,
    h: number,
    align: 'left' | 'center' | 'right' = 'left',
    bold = false,
    color: RGB = C.ink,
    fontSize = 8,
  ) {
    pf(bold)
    doc.setFontSize(fontSize)
    doc.setTextColor(...color)
    const pad = align === 'left' ? 6 : 0
    const lineH = fontSize * 1.35
    const lines = doc.splitTextToSize(text, w - 10)
    // Clamp to lines that physically fit in the cell — prevents negative baseY
    // when custom font glyph-width metrics cause splitTextToSize to split
    // text character-by-character, producing hundreds of lines and making
    // (h - totalTextH) / 2 go deeply negative (text renders above the page).
    const maxLines = Math.max(1, Math.floor(h / lineH))
    const renderLines = lines.length <= maxLines ? lines : lines.slice(0, maxLines)
    const totalTextH = renderLines.length * lineH
    const baseY = cellY + (h - totalTextH) / 2 + lineH * 0.78
    if (align === 'center') {
      doc.text(renderLines, x + w / 2, baseY, { align: 'center' })
    } else if (align === 'right') {
      doc.text(renderLines, x + w - 5, baseY, { align: 'right' })
    } else {
      doc.text(renderLines, x + pad, baseY)
    }
  }

  function ratingDots(score: number | null | undefined, x: number, cy: number, r = 5, gap = 4) {
    for (let i = 1; i <= 5; i++) {
      const cx = x + (i - 1) * (r * 2 + gap)
      if (score != null && i <= Math.round(score)) {
        doc.setFillColor(...C.orange)
        doc.circle(cx, cy, r, 'F')
      } else {
        doc.setFillColor(...C.white)
        doc.setDrawColor(...C.border)
        doc.circle(cx, cy, r, 'FD')
      }
    }
  }

  function scoreBox(score: number | null, x: number, bY: number, w: number, h: number) {
    const bg = score != null ? (SCORE_BG[Math.round(score)] ?? C.muted) : C.muted
    doc.setFillColor(...bg)
    doc.roundedRect(x, bY, w, h, 3, 3, 'F')
    pf(true)
    doc.setFontSize(12)
    doc.setTextColor(...C.white)
    doc.text(score != null ? String(Math.round(score)) : '—', x + w / 2, bY + h / 2 + 4.5, { align: 'center' })
  }

  function tblHeader(cols: { text: string; w: number }[], h = 18) {
    needPage(h)
    doc.setFillColor(...C.blueLt)
    doc.setDrawColor(...C.border)
    doc.rect(M, y, CW, h, 'FD')
    let x = M
    cols.forEach((col, i) => {
      cellText(col.text, x, y, col.w, h, 'center', true, C.navy, 7)
      if (i < cols.length - 1) colDivider(x + col.w, y, h)
      x += col.w
    })
    y += h
  }

  function tblRow(
    cells: { text: string; align?: 'left' | 'center' | 'right'; bold?: boolean }[],
    widths: number[],
    h: number,
    opts: { alt?: boolean; subHeader?: boolean; total?: boolean } = {},
  ) {
    needPage(h)
    let bg: RGB
    if (opts.total) bg = C.navy
    else if (opts.subHeader) bg = C.rowAlt
    else if (opts.alt) bg = C.paper
    else bg = C.white
    doc.setFillColor(...bg)
    doc.setDrawColor(...C.border)
    doc.rect(M, y, CW, h, 'FD')
    let x = M
    cells.forEach((cell, i) => {
      const color: RGB = opts.total ? C.white : C.ink
      cellText(cell.text, x, y, widths[i], h, cell.align ?? 'left', cell.bold ?? opts.total ?? false, color)
      if (i < cells.length - 1) colDivider(x + widths[i], y, h)
      x += widths[i]
    })
    y += h
  }

  // ─── PAGE 1 COVER ─────────────────────────────────────────────────────────
  renderPageFrame()
  y = M + 44

  // Title banner
  doc.setFillColor(...C.navy)
  doc.rect(M, y, CW, 54, 'F')
  doc.setFillColor(...C.blue)
  doc.rect(M, y + 51, CW * 0.68, 3, 'F')
  doc.setFillColor(...C.red)
  doc.rect(M + CW * 0.68, y + 51, CW * 0.32, 3, 'F')
  doc.setFillColor(...C.white)
  doc.roundedRect(M + 10, y + 9, 50, 36, 6, 6, 'F')
  pf(true)
  doc.setFontSize(13)
  doc.setTextColor(...C.navy)
  doc.text('AMW', M + 35, y + 30, { align: 'center' })
  pf(true)
  doc.setFontSize(12)
  doc.setTextColor(...C.white)
  doc.text('Performance Evaluation Form', M + 72, y + 22)
  doc.setFontSize(7.5)
  doc.setTextColor(170, 200, 242)
  doc.text(`${formDef.code} · ${formDef.titleEn}`, M + 72, y + 38)
  doc.setFontSize(7)
  doc.setTextColor(140, 170, 210)
  doc.text(documentId, PW - M - 8, y + 22, { align: 'right' })
  doc.text(fmtDate(new Date().toISOString()), PW - M - 8, y + 36, { align: 'right' })
  y += 54

  // Employee info grid
  const iW: [number, number, number, number] = [CW * 0.18, CW * 0.32, CW * 0.18, CW * 0.32]
  const infoRows: [string, string, string, string][] = [
    ['Employee Name', displayEmployee, 'Department', displayDept],
    ['Position', displayPosition, 'Hire Date', fmtDate(ev.evaluatee?.hireDate)],
    ['Evaluator', displayEvaluator, 'Evaluator Title', ev.evaluatorTitle ?? '—'],
    ['Period', `${fmtDate(ev.cycle?.startDate)} – ${fmtDate(ev.cycle?.endDate)}`, 'Evaluation Type', ev.type ?? '—'],
    ['Reason', ev.evaluationReason ?? '—', 'Status', ev.status ?? '—'],
  ]

  needPage(16 + infoRows.length * 20)
  doc.setFillColor(...C.blueLt)
  doc.setDrawColor(...C.border)
  doc.rect(M, y, CW, 16, 'FD')
  pfTh()
  doc.setFontSize(7)
  doc.setTextColor(...C.navy)
  doc.text('ข้อมูลพนักงาน  /  Employee Information', M + 8, y + 11)
  y += 16

  infoRows.forEach((row, ri) => {
    const rh = 20
    doc.setDrawColor(...C.border)
    let rx = M
    row.forEach((cell, ci) => {
      const w = iW[ci]
      const isLabel = ci % 2 === 0
      doc.setFillColor(...(isLabel ? C.blueLt : (ri % 2 === 0 ? C.white : C.paper)))
      doc.rect(rx, y, w, rh, 'F')
      cellText(cell, rx, y, w, rh, 'left', isLabel, isLabel ? C.navy : C.ink, 7.5)
      if (ci < 3) colDivider(rx + w, y, rh)
      rx += w
    })
    doc.setDrawColor(...C.border)
    doc.rect(M, y, CW, rh, 'D')
    y += rh
  })

  y += 12

  const attMW = CW * 0.55

  // ─── SECTIONS ─────────────────────────────────────────────────────────────
  let partN = 1

  if (isWeighted) {
    // ── PART 1: GOAL SETTING KPI ──────────────────────────────────────────
    partBanner(`ส่วนที่ ${partN++}`, 'การตั้งเป้าหมาย (KPI)', 'Goal Setting (KPI)')

    const GW = [20, 196, 38, 32, 32, 32, 32, 32, 48, 39] as const
    tblHeader([
      { text: '#', w: GW[0] },
      { text: 'KPI Goal Description', w: GW[1] },
      { text: 'Wt%', w: GW[2] },
      { text: '★5', w: GW[3] },
      { text: '★4', w: GW[4] },
      { text: '★3', w: GW[5] },
      { text: '★2', w: GW[6] },
      { text: '★1', w: GW[7] },
      { text: 'Actual', w: GW[8] },
      { text: 'Score', w: GW[9] },
    ], 20)

    if (goals.length === 0) {
      tblRow([{ text: 'No goal entries recorded.', align: 'center' }], [CW], 22)
    }

    goals.forEach((goal, gi) => {
      const goalLines = doc.splitTextToSize(goal.goal || '—', GW[1] - 10)
      const rh = Math.max(22, goalLines.length * 9.5 + 10)
      needPage(rh)

      const rowBg: RGB = gi % 2 === 0 ? C.white : C.paper
      doc.setFillColor(...rowBg)
      doc.setDrawColor(...C.border)
      doc.rect(M, y, CW, rh, 'FD')

      let gx = M
      const cols = [
        String(gi + 1),
        goal.goal || '—',
        `${goal.weight}%`,
        goal.targetRating5 ?? '—',
        goal.targetRating4 ?? '—',
        goal.targetRating3 ?? '—',
        goal.targetRating2 ?? '—',
        goal.targetRating1 ?? '—',
        goal.result ?? '—',
      ]
      cols.forEach((t, i) => {
        const w = GW[i]
        const isMatched = i >= 3 && i <= 7 && goal.evaluationScore != null && (8 - i) === goal.evaluationScore
        if (isMatched) {
          doc.setFillColor(...C.blueLt)
          doc.rect(gx, y, w, rh, 'F')
        }
        const align = i === 1 ? 'left' : 'center'
        const sz = i === 1 ? 7.5 : 8
        cellText(t, gx, y, w, rh, align, false, C.ink, sz)
        if (i < 8) colDivider(gx + w, y, rh)
        gx += w
      })
      const lastW = GW[9]
      if (goal.evaluationScore != null) {
        scoreBox(goal.evaluationScore, gx + 4, y + rh / 2 - 11, lastW - 8, 22)
      } else {
        cellText('—', gx, y, lastW, rh, 'center')
      }
      y += rh
    })

    const totalGoalWeight = goals.reduce((s, g) => s + (Number(g.weight) || 0), 0)
    needPage(18)
    doc.setFillColor(...C.blueLt)
    doc.setDrawColor(...C.border)
    doc.rect(M, y, CW, 16, 'FD')
    pf(true)
    doc.setFontSize(7.5)
    doc.setTextColor(...C.navy)
    doc.text(`Total Goal Weight: ${totalGoalWeight}%  (max 70%)`, M + 8, y + 11)
    doc.text(`Goal Score: ${fmtScore(goalScore)}`, PW - M - 8, y + 11, { align: 'right' })
    y += 16
    y += 10

    // ── PART 2: CORE COMPETENCY ───────────────────────────────────────────
    partBanner(`ส่วนที่ ${partN++}`, 'สมรรถนะหลัก (Core Competency)', 'Core Competency')

    const dotsColW = 84
    const CCW = [30, 160, CW - 30 - 160 - 52 - dotsColW, 52, dotsColW] as const
    tblHeader([
      { text: '#', w: CCW[0] },
      { text: 'Competency', w: CCW[1] },
      { text: 'Description (for this position)', w: CCW[2] },
      { text: 'Score', w: CCW[3] },
      { text: '● Rating', w: CCW[4] },
    ], 20)

    if (positionCompetencies.length === 0) {
      tblRow([{ text: 'No competency definitions for this position.', align: 'center' }], [CW], 22)
    }

    positionCompetencies.forEach((cc, ci) => {
      const pos = ev.evaluatee?.position as Position | undefined
      const desc = pos ? (cc.descriptions[pos] ?? cc.descriptions['OFFICER'] ?? '') : ''
      const descLines = doc.splitTextToSize(desc, CCW[2] - 10)
      const rh = Math.max(22, descLines.length * 9 + 10)
      needPage(rh)

      const sc = scoreById.get(cc.id) ?? null
      doc.setFillColor(...(ci % 2 === 0 ? C.white : C.paper))
      doc.setDrawColor(...C.border)
      doc.rect(M, y, CW, rh, 'FD')

      let ccx = M
      cellText(String(ci + 1), ccx, y, CCW[0], rh, 'center')
      colDivider(ccx + CCW[0], y, rh)
      ccx += CCW[0]
      cellText(cc.name, ccx, y, CCW[1], rh, 'left', true, C.navy, 7.5)
      colDivider(ccx + CCW[1], y, rh)
      ccx += CCW[1]
      cellText(desc, ccx, y, CCW[2], rh, 'left', false, C.ink, 7.5)
      colDivider(ccx + CCW[2], y, rh)
      ccx += CCW[2]
      if (sc != null) {
        scoreBox(sc, ccx + 6, y + rh / 2 - 11, CCW[3] - 12, 22)
      } else {
        cellText('—', ccx, y, CCW[3], rh, 'center', false, C.muted)
      }
      colDivider(ccx + CCW[3], y, rh)
      ccx += CCW[3]
      ratingDots(sc, ccx + 8, y + rh / 2, 5, 5)
      y += rh
    })

    needPage(18)
    doc.setFillColor(...C.blueLt)
    doc.setDrawColor(...C.border)
    doc.rect(M, y, CW, 16, 'FD')
    pf(true)
    doc.setFontSize(7.5)
    doc.setTextColor(...C.navy)
    doc.text(`Core Competency Average Score:  ${fmtScore(competencyScore)}`, M + 8, y + 11)
    y += 16
    y += 10

    // ── PART 3: ATTENDANCE ───────────────────────────────────────────────
    partBanner(`ส่วนที่ ${partN++}`, 'การมาปฏิบัติงาน', 'Attendance')

    tblHeader([{ text: 'Metric', w: attMW }, { text: 'Value', w: CW - attMW }], 18)
    const attRows: [string, string][] = [
      ['Leave Actual Days  (วันลาจริง)', attRecord?.leaveActualDays != null ? `${attRecord.leaveActualDays} day(s)` : '—'],
      ['Late Actual Times  (ครั้งที่มาสาย)', attRecord?.lateActualTimes != null ? `${attRecord.lateActualTimes} time(s)` : '—'],
      ['Disciplinary Level  (ระดับโทษทางวินัย)', attRecord?.disciplinaryLevel ?? '—'],
      ['Attendance Average Score  (คะแนนเฉลี่ย)', fmtScore(attScore)],
    ]
    attRows.forEach(([label, val], ri) => {
      tblRow([
        { text: label, bold: ri === 3 },
        { text: val, align: 'center', bold: ri === 3 },
      ], [attMW, CW - attMW], 20, { alt: ri % 2 !== 0 })
    })
    y += 10

    // ── PART 4: TRAINING ─────────────────────────────────────────────────
    partBanner(`ส่วนที่ ${partN++}`, 'การฝึกอบรม', 'Training')

    tblHeader([{ text: 'Metric', w: attMW }, { text: 'Value', w: CW - attMW }], 18)
    const trn = ev.trainingRecord
    const trnRows: [string, string][] = [
      ['Minimum Training Hours Required  (ชั่วโมงขั้นต่ำ)', trn?.minimumHours != null ? `${trn.minimumHours} hrs` : '—'],
      ['Actual Training Hours  (ชั่วโมงจริง)', trn?.actualHours != null ? `${trn.actualHours} hrs` : '—'],
      ['% vs Minimum  (% เทียบกับขั้นต่ำ)', trn?.percentOfMinimum != null ? `${trn.percentOfMinimum.toFixed(1)}%` : '—'],
      ['Training Score  (คะแนน)', trainingScore != null ? String(trainingScore) : '—'],
    ]
    trnRows.forEach(([label, val], ri) => {
      tblRow([
        { text: label, bold: ri === 3 },
        { text: val, align: 'center', bold: ri === 3 },
      ], [attMW, CW - attMW], 20, { alt: ri % 2 !== 0 })
    })
    y += 10

    // ── PART 5: PERFORMANCE SUMMARY ──────────────────────────────────────
    partBanner(`ส่วนที่ ${partN++}`, 'สรุปผลการประเมิน', 'Performance Summary')

    const SW = [CW * 0.43, CW * 0.15, CW * 0.21, CW * 0.21]
    tblHeader([
      { text: 'หัวข้อการประเมิน  /  Section', w: SW[0] },
      { text: 'น้ำหนัก / Weight', w: SW[1] },
      { text: 'คะแนนที่ได้ / Score', w: SW[2] },
      { text: 'คะแนนถ่วงน้ำหนัก / Weighted', w: SW[3] },
    ], 20)

    const sumRow = (
      label: string, weight: string, rawScore: string, weighted: string,
      opts: { subHeader?: boolean; total?: boolean; indent?: boolean } = {}
    ) => {
      const rh = 18
      needPage(rh)
      const isTotal = opts.total ?? false
      const isSH = opts.subHeader ?? false
      const bg: RGB = isTotal ? C.navy : isSH ? C.rowAlt : C.white
      doc.setFillColor(...bg)
      doc.setDrawColor(...C.border)
      doc.rect(M, y, CW, rh, 'FD')
      const textColor: RGB = isTotal ? C.white : C.ink
      const indent = opts.indent ? 14 : 6
      pf(isTotal || isSH)
      doc.setFontSize(7.5)
      doc.setTextColor(...textColor)
      const labelLines = doc.splitTextToSize(label, SW[0] - indent - 4)
      doc.text(labelLines, M + indent, y + rh / 2 + 3)
      ;[weight, rawScore, weighted].forEach((t, i) => {
        const x = M + SW[0] + SW.slice(1, i + 1).reduce((a, b) => a + b, 0)
        const w = SW[i + 1]
        const lines = doc.splitTextToSize(t, w - 8)
        doc.text(lines, x + w / 2, y + rh / 2 + 3, { align: 'center' })
        colDivider(x, y, rh)
      })
      y += rh
    }

    const gWScore = goalScore != null ? fmtScore((goalScore * effectiveGoalWeight) / 100) : '—'
    sumRow(
      `1. Goal Setting (KPI)  — Total Weight: ${goals.reduce((s, g) => s + (Number(g.weight) || 0), 0)}%`,
      `${effectiveGoalWeight}%`,
      fmtScore(goalScore),
      gWScore,
      { subHeader: true },
    )
    goals.forEach((g, gi) => {
      const sc = g.evaluationScore != null ? String(g.evaluationScore) : '—'
      sumRow(`  ${gi + 1}. ${g.goal || '—'}`, `${g.weight}%`, sc, '—', { indent: true })
    })

    const compWScore = competencyScore != null ? fmtScore((competencyScore * cWeight) / 100) : '—'
    sumRow('2. Core Competency', `${cWeight}%`, fmtScore(competencyScore), compWScore, { subHeader: true })
    positionCompetencies.forEach((cc) => {
      const sc = scoreById.get(cc.id)
      sumRow(`  ${cc.name}`, '—', sc != null ? String(sc) : '—', '—', { indent: true })
    })

    const attWScore = attScore != null ? fmtScore((attScore * aWeight) / 100) : '—'
    sumRow('3. Attendance  (การมาปฏิบัติงาน)', `${aWeight}%`, fmtScore(attScore), attWScore, { subHeader: true })

    const trnWScore = trainingScore != null ? fmtScore((trainingScore * effectiveTrainingWeight) / 100) : '—'
    sumRow(
      `4. Training  (การฝึกอบรม)${trainingScore == null ? ' — N/A (0%)' : ''}`,
      `${effectiveTrainingWeight}%`,
      trainingScore != null ? String(trainingScore) : '—',
      trnWScore,
      { subHeader: true },
    )

    sumRow(
      'รวม  /  TOTAL SCORE',
      '100%',
      '—',
      weightedTotal != null ? weightedTotal.toFixed(3) : '—',
      { total: true },
    )

    y += 8

    // Calibration panel
    if (weightedTotal != null && calibGrade != null) {
      needPage(60)
      const roundedTotal = Math.round(weightedTotal)
      doc.setFillColor(...C.blueLt)
      doc.setDrawColor(...C.border)
      doc.rect(M, y, CW, 58, 'FD')
      pf(true)
      doc.setFontSize(7.5)
      doc.setTextColor(...C.navy)
      doc.text('CALIBRATION RESULT', M + 10, y + 14)
      ratingDots(roundedTotal, M + 10, y + 32, 6.5, 5)
      scoreBox(roundedTotal, PW - M - 52, y + 9, 44, 40)
      doc.setFontSize(12)
      doc.setTextColor(...C.navy)
      doc.text(calibGrade.labelEn, M + 110, y + 22)
      pf(false)
      doc.setFontSize(7.5)
      doc.setTextColor(...C.muted)
      doc.text(`${calibGrade.definitionEn}`, M + 110, y + 36, { maxWidth: CW - 180 })
      doc.setFontSize(7)
      doc.text(`Total Score: ${weightedTotal.toFixed(3)}`, M + 110, y + 50)
      y += 58
    }

    y += 12

  } else {
    // ── OSE FORM: EVALUATION CRITERIA ──────────────────────────────────
    partBanner(`ส่วนที่ ${partN++}`, 'การประเมินผลการปฏิบัติงาน', 'Evaluation Criteria')

    const dotsW = 82
    const EC = [CW * 0.08, CW * 0.07, CW - CW * 0.08 - CW * 0.07 - 48 - dotsW, 48, dotsW] as const
    tblHeader([
      { text: 'Cat.', w: EC[0] },
      { text: 'ID', w: EC[1] },
      { text: 'Criterion', w: EC[2] },
      { text: 'Score', w: EC[3] },
      { text: '● Rating', w: EC[4] },
    ], 20)

    let critRow = 0
    formDef.categories.forEach((cat) => {
      needPage(14)
      doc.setFillColor(...C.rowAlt)
      doc.setDrawColor(...C.border)
      doc.rect(M, y, CW, 14, 'FD')
      pfTh()
      doc.setFontSize(7)
      doc.setTextColor(...C.blue)
      doc.text(`${cat.num}. ${cat.titleEn}  /  ${cat.titleTh}`, M + 8, y + 10)
      y += 14

      cat.criteria.forEach((crit) => {
        const critLines = doc.splitTextToSize(crit.en, EC[2] - 8)
        const rh = Math.max(22, critLines.length * 8.5 + 10)
        needPage(rh)

        const sc = scoreById.get(crit.id) ?? null
        doc.setFillColor(...(critRow % 2 === 0 ? C.white : C.paper))
        doc.setDrawColor(...C.border)
        doc.rect(M, y, CW, rh, 'FD')

        let ecx = M
        cellText(cat.num, ecx, y, EC[0], rh, 'center')
        colDivider(ecx + EC[0], y, rh)
        ecx += EC[0]
        cellText(crit.id, ecx, y, EC[1], rh, 'center')
        colDivider(ecx + EC[1], y, rh)
        ecx += EC[1]
        cellText(crit.en, ecx, y, EC[2], rh, 'left', false, C.ink, 7.5)
        colDivider(ecx + EC[2], y, rh)
        ecx += EC[2]
        if (sc != null) {
          scoreBox(sc, ecx + 6, y + rh / 2 - 11, EC[3] - 12, 22)
        } else {
          cellText('—', ecx, y, EC[3], rh, 'center', false, C.muted)
        }
        colDivider(ecx + EC[3], y, rh)
        ecx += EC[3]
        ratingDots(sc, ecx + 8, y + rh / 2, 5, 5)
        y += rh
        critRow++
      })
    })

    needPage(20)
    doc.setFillColor(...C.blueLt)
    doc.setDrawColor(...C.border)
    doc.rect(M, y, CW, 18, 'FD')
    pfTh()
    doc.setFontSize(7.5)
    doc.setTextColor(...C.navy)
    doc.text('Average Score  /  คะแนนเฉลี่ย:', M + 8, y + 12)
    if (oseAvg != null) {
      doc.text(oseAvg.toFixed(2), M + CW / 2 - 50, y + 12, { align: 'right' })
      ratingDots(oseAvg, M + CW / 2 - 40, y + 11, 5, 5)
    } else {
      doc.setTextColor(...C.muted)
      pf(false)
      doc.text('—', M + CW / 2, y + 12, { align: 'center' })
    }
    y += 18
    y += 10

    // OSE Summary
    partBanner(`ส่วนที่ ${partN++}`, 'สรุปผลการประเมิน', 'Performance Summary')

    // ── Calibration banner ────────────────────────────────────────────────────
    needPage(74)
    if (oseGrade != null && oseAvg != null) {
      doc.setFillColor(...C.navy)
      doc.setDrawColor(...C.border)
      doc.rect(M, y, CW, 72, 'FD')
      // Left: score label + big number
      pfTh()
      doc.setFontSize(7)
      doc.setTextColor(170, 200, 242)
      doc.text('Calibrated Score  /  คะแนนรวม', M + 16, y + 16)
      pf(true)
      doc.setFontSize(30)
      doc.setTextColor(...C.white)
      doc.text(oseAvg.toFixed(2), M + 16, y + 50)
      // Rating dots under the big number
      ratingDots(Math.round(oseAvg), M + 16, y + 60, 5, 5)
      // Center divider
      doc.setDrawColor(255, 255, 255, 0.12)
      doc.line(M + 110, y + 12, M + 110, y + 60)
      // Right: grade badge + label + definition
      pf(true)
      doc.setFontSize(9)
      doc.setTextColor(170, 200, 242)
      doc.text('Grade', M + 122, y + 16)
      // Grade badge
      const gradeBg = SCORE_BG[Math.round(oseAvg)] ?? C.blue
      doc.setFillColor(...gradeBg)
      doc.roundedRect(M + 120, y + 22, 38, 26, 4, 4, 'F')
      pf(true)
      doc.setFontSize(16)
      doc.setTextColor(...C.white)
      doc.text(String(Math.round(oseAvg)), M + 139, y + 40, { align: 'center' })
      // Grade label & definition
      pf(true)
      doc.setFontSize(10)
      doc.setTextColor(...C.white)
      doc.text(oseGrade.en, M + 168, y + 34)
      pf(false)
      doc.setFontSize(7)
      doc.setTextColor(170, 200, 242)
      doc.text(oseGrade.definitionEn, M + 168, y + 48, { maxWidth: CW - 182 })
      // Score box (right edge)
      scoreBox(Math.round(oseAvg), PW - M - 54, y + 14, 44, 44)
      y += 72
    } else {
      doc.setFillColor(...C.paper)
      doc.setDrawColor(...C.border)
      doc.rect(M, y, CW, 30, 'FD')
      pf(false)
      doc.setFontSize(8)
      doc.setTextColor(...C.muted)
      doc.text('No scores recorded — evaluation not complete.', M + CW / 2, y + 17, { align: 'center' })
      y += 30
    }

    // ── Section breakdown table ───────────────────────────────────────────────
    y += 10
    const oseBW = [CW * 0.52, CW * 0.24, CW * 0.24] as const

    tblHeader([
      { text: 'Section', w: oseBW[0] },
      { text: 'Score', w: oseBW[1] },
      { text: 'Rating', w: oseBW[2] },
    ], 18)

    const oseRow = (label: string, score: number | null) => {
      const rh = 22
      needPage(rh)
      doc.setFillColor(...C.rowAlt)
      doc.setDrawColor(...C.border)
      doc.rect(M, y, CW, rh, 'FD')
      cellText(label, M, y, oseBW[0], rh, 'left', true, C.navy, 7.5)
      colDivider(M + oseBW[0], y, rh)
      if (score != null) {
        cellText(score.toFixed(2), M + oseBW[0], y, oseBW[1], rh, 'center', true, C.navy, 9)
      } else {
        cellText('—', M + oseBW[0], y, oseBW[1], rh, 'center', false, C.muted, 8)
      }
      colDivider(M + oseBW[0] + oseBW[1], y, rh)
      ratingDots(score, M + oseBW[0] + oseBW[1] + 14, y + rh / 2 - 1, 4.5, 5)
      y += rh
    }

    const oseSubRow = (label: string, score: number | null) => {
      const rh = 16
      needPage(rh)
      doc.setFillColor(...C.white)
      doc.setDrawColor(...C.border)
      doc.rect(M, y, CW, rh, 'FD')
      cellText(label, M + 14, y, oseBW[0] - 14, rh, 'left', false, C.muted, 6.5)
      colDivider(M + oseBW[0], y, rh)
      if (score != null) {
        cellText(score.toFixed(2), M + oseBW[0], y, oseBW[1], rh, 'center', false, C.ink, 7)
      } else {
        cellText('—', M + oseBW[0], y, oseBW[1], rh, 'center', false, C.muted, 7)
      }
      colDivider(M + oseBW[0] + oseBW[1], y, rh)
      ratingDots(score, M + oseBW[0] + oseBW[1] + 14, y + rh / 2, 3.5, 4)
      y += rh
    }

    // ── 1. Goal Setting ──────────────────────────────────────────────────────
    oseRow('1. Goal Setting (KPI)', goalScore)
    if (goals.length) {
      goals.forEach((g, i) => {
        oseSubRow(`${i + 1}. ${g.goal || '—'}  (${g.weight ?? 0}%)`, g.evaluationScore ?? null)
      })
    } else {
      oseSubRow('No goals recorded', null)
    }

    // ── 2. Evaluation Criteria ───────────────────────────────────────────────
    oseRow('2. Evaluation Criteria', oseAvg)
    formDef.categories.forEach(cat => {
      const catScores = cat.criteria
        .map(c => scoreById.get(c.id))
        .filter((s): s is number => s != null)
      const catAvg = catScores.length
        ? catScores.reduce((a, b) => a + b, 0) / catScores.length
        : null
      oseSubRow(`${cat.num}. ${cat.titleEn}`, catAvg)
    })

    // ── 3. Core Competency ───────────────────────────────────────────────────
    oseRow('3. Core Competency', competencyScore)
    if (positionCompetencies.length) {
      positionCompetencies.forEach(cc => {
        oseSubRow(cc.name, scoreById.get(cc.id) ?? null)
      })
    } else {
      oseSubRow('No competency definitions for this position', null)
    }

    // ── 4. Attendance ────────────────────────────────────────────────────────
    oseRow('4. Attendance', attScore)
    if (attRecord) {
      if (attRecord.leaveActualDays != null)
        oseSubRow(`Leave: ${attRecord.leaveActualDays} day(s)`, attRecord.leaveScore ?? null)
      if (attRecord.lateActualTimes != null)
        oseSubRow(`Late: ${attRecord.lateActualTimes} time(s)`, attRecord.lateScore ?? null)
      if (attRecord.disciplinaryLevel != null)
        oseSubRow(`Disciplinary: Level ${attRecord.disciplinaryLevel}`, attRecord.disciplinaryScore ?? null)
    } else {
      oseSubRow('No attendance record', null)
    }

    // ── 5. Training ──────────────────────────────────────────────────────────
    oseRow('5. Training', trainingScore)
    if (ev.trainingRecord) {
      const tr = ev.trainingRecord
      if (tr.actualHours != null && tr.minimumHours != null)
        oseSubRow(`Hours: ${tr.actualHours} / ${tr.minimumHours} required`, null)
      if (tr.percentOfMinimum != null)
        oseSubRow(`Completion: ${tr.percentOfMinimum.toFixed(0)}%`, null)
    } else {
      oseSubRow('No training record', null)
    }

    y += 12
  }

  // ─── COMMENTS ─────────────────────────────────────────────────────────────
  if (ev.comment) {
    partBanner(`ส่วนที่ ${partN++}`, 'ความคิดเห็น', 'Comments')
    const fields: [string, string | null | undefined][] = [
      ['จุดเด่น  /  Strengths', ev.comment.strengths],
      ['จุดที่ต้องพัฒนา  /  Areas for Improvement', ev.comment.improvements],
      ['ความรู้ / ทักษะที่ต้องพัฒนา  /  Required Skills', ev.comment.requiredSkills],
    ]
    fields.forEach(([label, val], fi) => {
      const text = val?.trim() || '—'
      const textLines = doc.splitTextToSize(text, CW - 20)
      const bh = Math.max(40, textLines.length * 10 + 22)
      needPage(bh)
      doc.setFillColor(...(fi % 2 === 0 ? C.white : C.paper))
      doc.setDrawColor(...C.border)
      doc.rect(M, y, CW, bh, 'FD')
      pfTh()
      doc.setFontSize(7.5)
      doc.setTextColor(...C.navy)
      doc.text(label, M + 8, y + 13)
      pf(false)
      doc.setFontSize(8)
      doc.setTextColor(...C.ink)
      doc.text(textLines, M + 12, y + 25)
      y += bh
    })
    y += 12
  }

  // ─── SALARY SUMMARY (if present) ─────────────────────────────────────────
  if (ev.salarySummary) {
    const ss = ev.salarySummary
    partBanner(`ส่วนที่ ${partN++}`, 'สรุปเงินเดือน / โบนัส', 'Salary / Compensation')
    const salW = attMW
    tblHeader([{ text: 'Item', w: salW }, { text: 'Amount', w: CW - salW }], 18)
    const salRows: [string, string][] = [
      ['Old Salary', ss.oldSalary != null ? ss.oldSalary.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'],
      ['New Salary', ss.newSalary != null ? ss.newSalary.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'],
      ['Bonus', ss.bonus != null ? ss.bonus.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'],
      ['Bonus Deduction', ss.bonusDeduction != null ? ss.bonusDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'],
      ['Effective Date', fmtDate(ss.effectiveDate)],
    ]
    salRows.forEach(([label, val], ri) => {
      tblRow([{ text: label }, { text: val, align: 'center' }], [salW, CW - salW], 20, { alt: ri % 2 !== 0 })
    })
    if (ss.bonusPolicy) {
      needPage(36)
      const policyLines = doc.splitTextToSize(ss.bonusPolicy, CW - 20)
      const ph = Math.max(30, policyLines.length * 10 + 20)
      doc.setFillColor(...C.paper)
      doc.setDrawColor(...C.border)
      doc.rect(M, y, CW, ph, 'FD')
      pf(true)
      doc.setFontSize(7.5)
      doc.setTextColor(...C.navy)
      doc.text('Bonus Policy', M + 8, y + 13)
      pf(false)
      doc.setFontSize(8)
      doc.setTextColor(...C.ink)
      doc.text(policyLines, M + 12, y + 24)
      y += ph
    }
    y += 12
  }

  // ─── ACKNOWLEDGEMENT / SIGNATURES ─────────────────────────────────────────
  needPage(110)
  partBanner(`ส่วนที่ ${partN++}`, 'การรับทราบ / ลายเซ็น', 'Acknowledgement & Signatures')

  const signers = [
    { label: 'Employee  /  พนักงาน', name: displayEmployee, signedAt: ev.acknowledgement?.employeeSignedAt },
    { label: 'Evaluator  /  ผู้ประเมิน', name: displayEvaluator, signedAt: ev.acknowledgement?.evaluatorSignedAt },
    { label: 'Director  /  ผู้บริหาร', name: '—', signedAt: ev.acknowledgement?.directorSignedAt },
  ]

  const sigW = CW / 3
  const sigLabelH = 16
  needPage(sigLabelH + 80)
  doc.setFillColor(...C.blueLt)
  doc.setDrawColor(...C.border)
  doc.rect(M, y, CW, sigLabelH, 'FD')
  signers.forEach((s, i) => {
    pfTh()
    doc.setFontSize(7)
    doc.setTextColor(...C.navy)
    doc.text(s.label, M + i * sigW + sigW / 2, y + 11, { align: 'center' })
    if (i < 2) colDivider(M + (i + 1) * sigW, y, sigLabelH)
  })
  y += sigLabelH

  const sigBoxH = 80
  doc.setFillColor(...C.white)
  doc.setDrawColor(...C.border)
  doc.rect(M, y, CW, sigBoxH, 'FD')
  signers.forEach((s, i) => {
    const sx = M + i * sigW
    if (i < 2) colDivider(sx + sigW, y, sigBoxH)

    if (s.signedAt) {
      doc.setFillColor(...C.green)
      doc.circle(sx + sigW / 2, y + 22, 7, 'F')
      pf(true)
      doc.setFontSize(8)
      doc.setTextColor(...C.white)
      doc.text('✓', sx + sigW / 2, y + 25, { align: 'center' })
      pf(false)
      doc.setFontSize(7)
      doc.setTextColor(...C.green)
      doc.text('Signed', sx + sigW / 2, y + 37, { align: 'center' })
      doc.setTextColor(...C.muted)
      doc.setFontSize(6.5)
      doc.text(fmtDate(s.signedAt as string), sx + sigW / 2, y + 47, { align: 'center' })
    } else {
      doc.setDrawColor(...C.border)
      doc.setLineDashPattern([3, 3], 0)
      doc.line(sx + 14, y + 44, sx + sigW - 14, y + 44)
      doc.setLineDashPattern([], 0)
      pf(false)
      doc.setFontSize(6.5)
      doc.setTextColor(...C.muted)
      doc.text('Signature', sx + sigW / 2, y + 53, { align: 'center' })
    }

    pf(false)
    doc.setFontSize(7)
    doc.setTextColor(...C.muted)
    doc.text(s.name, sx + sigW / 2, y + 67, { align: 'center', maxWidth: sigW - 16 })
  })
  y += sigBoxH

  // ─── FIX PAGE NUMBERS ─────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg)
    doc.setFillColor(...C.paper)
    doc.rect(M, PH - 20, CW, 14, 'F')
    pf(false)
    doc.setFontSize(6.5)
    doc.setTextColor(...C.muted)
    doc.text(`PAGE ${pg} OF ${totalPages}`, PW - M, PH - 8, { align: 'right' })
  }

  const name = fallbackName ?? `evaluation-${cleanFilePart(displayEmployee)}-${ev.id}.pdf`
  doc.save(name)
}
