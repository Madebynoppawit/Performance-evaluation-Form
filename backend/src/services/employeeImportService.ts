import { randomBytes } from 'crypto'
import { Position, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { hashPassword } from '../utils/hash'

/* Employee master-file importer.
   Parses a delimited export (CSV or TSV) of the company's employee list and
   upserts every row into the User table (keyed by employee No), keeping the
   full raw row in `sourceData` so nothing is dropped. Each run is logged in
   EmployeeImport with a per-row error report — rows that fail are reported,
   never silently skipped. */

export interface ImportRowError {
  row: number
  employeeNo?: string
  email?: string
  reason: string
}

export interface ImportSummary {
  importId: string
  totalRows: number
  created: number
  updated: number
  failed: number
  errors: ImportRowError[]
}

/** Parse CSV/TSV text into row objects keyed by the (trimmed) header names. */
export function parseDelimited(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split('\n', 1)[0] ?? ''
  const tabs = (firstLine.match(/\t/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  const delimiter = tabs > commas ? '\t' : ','

  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < clean.length; i += 1) {
    const c = clean[i]
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i += 1 } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === delimiter) { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c === '\r') { /* ignore */ }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  if (rows.length === 0) return []

  const headers = rows[0].map(h => h.trim())
  return rows
    .slice(1)
    .filter(r => r.some(c => c.trim() !== ''))
    .map(r => {
      const obj: Record<string, string> = {}
      headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim() })
      return obj
    })
}

/** Case-insensitive lookup across possible header spellings. */
function pick(row: Record<string, string>, ...names: string[]): string {
  const keys = Object.keys(row)
  for (const name of names) {
    const hit = keys.find(k => k.toLowerCase().trim() === name.toLowerCase())
    if (hit && row[hit]) return row[hit]
  }
  return ''
}

/** Map the master file's "Position Level" to the app's Position enum. */
export function mapPositionLevel(level: string): Position | null {
  const v = (level || '').toUpperCase()
  if (v.includes('PRESIDENT') || v.includes('DIRECTOR') || v.includes('MANAGING')) return 'DIRECTOR_UP'
  if (v.includes('MANAGER')) return 'MANAGER'
  if (v.includes('SUPERVISOR')) return 'SUPERVISOR'
  if (v.includes('OPERATOR')) return 'PRODUCTION_STAFF'
  if (v.includes('STAFF')) return 'OFFICER'
  return null
}

function parseDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function importEmployees(
  text: string,
  filename: string | undefined,
  importedById: string
): Promise<ImportSummary> {
  const rows = parseDelimited(text)
  const errors: ImportRowError[] = []
  let created = 0
  let updated = 0

  for (let i = 0; i < rows.length; i += 1) {
    const raw = rows[i]
    const rowNo = i + 2 // header is row 1
    // Employee numbers past 999 come quoted with a thousands comma ("1,015") —
    // strip separators so the key is a clean "1015".
    const employeeNo = pick(raw, 'No', 'Employee No', 'EmployeeNo', 'EMP NO', 'Code No').replace(/[,\s]/g, '')
    const email = pick(raw, 'Email', 'E-mail').toLowerCase()
    const first = pick(raw, 'Name')
    const last = pick(raw, 'Surname')
    const name = `${first} ${last}`.trim() || pick(raw, 'Thai name', 'Thai Name') || `Employee ${employeeNo || rowNo}`

    if (!employeeNo && !email) {
      errors.push({ row: rowNo, reason: 'Row has neither an employee No nor an email — cannot key it.' })
      continue
    }

    // `email` is required + unique, so only set it when present (never null it).
    const data = {
      name,
      department: pick(raw, 'Department') || null,
      jobTitle: pick(raw, 'Position', 'Positiion', 'Job Title') || null,
      position: mapPositionLevel(pick(raw, 'Position Level', 'Position level')),
      hireDate: parseDate(pick(raw, 'Start date', 'Start Date')),
      sourceData: raw as Prisma.InputJsonValue,
    }
    const updateData = email ? { ...data, email } : data

    try {
      if (employeeNo) {
        const existing = await prisma.user.findUnique({ where: { employeeNo }, select: { id: true } })
        if (existing) {
          await prisma.user.update({ where: { employeeNo }, data: updateData })
          updated += 1
        } else {
          await prisma.user.create({
            data: {
              ...data,
              email: email || `emp.${employeeNo}@import.local`,
              employeeNo,
              role: 'EMPLOYEE',
              password: await hashPassword(randomBytes(12).toString('hex')),
            },
          })
          created += 1
        }
      } else {
        const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
        if (existing) {
          await prisma.user.update({ where: { email }, data: updateData })
          updated += 1
        } else {
          await prisma.user.create({
            data: { ...data, email, role: 'EMPLOYEE', password: await hashPassword(randomBytes(12).toString('hex')) },
          })
          created += 1
        }
      }
    } catch (err) {
      const reason =
        (err as { code?: string }).code === 'P2002'
          ? 'Email already used by a different employee.'
          : (err as Error).message
      errors.push({ row: rowNo, employeeNo: employeeNo || undefined, email: email || undefined, reason })
    }
  }

  const log = await prisma.employeeImport.create({
    data: {
      filename: filename ?? null,
      importedById,
      totalRows: rows.length,
      created,
      updated,
      failed: errors.length,
      errors: errors as unknown as Prisma.InputJsonValue,
      raw: text,
    },
    select: { id: true },
  })

  return { importId: log.id, totalRows: rows.length, created, updated, failed: errors.length, errors }
}

export function getImportHistory() {
  return prisma.employeeImport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, filename: true, importedById: true, totalRows: true,
      created: true, updated: true, failed: true, createdAt: true,
    },
  })
}
