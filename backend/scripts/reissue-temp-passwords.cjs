/*
 * One-off migration: re-issue a unique temporary password to every user still
 * on an initial / never-changed password (mustChangePassword = true).
 *
 * Before this change all imported staff shared one default password, so knowing
 * it allowed logging in as any not-yet-onboarded account. This replaces each
 * with a unique random temp password and writes a CSV of credentials for the
 * admin to distribute. Affected users are still forced to set a new password on
 * first login.
 *
 * Run from the backend/ directory AFTER building (npm run build):
 *   node scripts/reissue-temp-passwords.cjs            # writes temp-credentials-<date>.csv
 *   node scripts/reissue-temp-passwords.cjs --out x.csv
 *   node scripts/reissue-temp-passwords.cjs --dry-run  # count only, no changes
 */
const fs = require('fs')
const { prisma } = require('../dist/lib/prisma')
const { hashPassword } = require('../dist/utils/hash')
const { generateTempPassword } = require('../dist/utils/tempPassword')

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const outIdx = argv.indexOf('--out')
const outFile = outIdx !== -1 ? argv[outIdx + 1] : `temp-credentials-${new Date().toISOString().slice(0, 10)}.csv`

;(async () => {
  const users = await prisma.user.findMany({
    where: { mustChangePassword: true },
    select: { id: true, employeeNo: true, email: true, name: true },
    orderBy: { employeeNo: 'asc' },
  })
  console.log(`${users.length} user(s) still on an initial password.`)
  if (dryRun) { console.log('Dry run — no changes made.'); await prisma.$disconnect(); return }

  const rows = [['Login (employee no / email)', 'Name', 'Temporary password']]
  let n = 0
  for (const u of users) {
    const tempPassword = generateTempPassword()
    await prisma.user.update({
      where: { id: u.id },
      data: { password: await hashPassword(tempPassword), mustChangePassword: true },
    })
    rows.push([u.employeeNo || u.email, u.name, tempPassword])
    if (++n % 50 === 0) console.log(`  …${n}/${users.length}`)
  }
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  fs.writeFileSync(outFile, '﻿' + csv, 'utf8')
  console.log(`Done. Re-issued ${users.length} credential(s) → ${outFile}`)
  await prisma.$disconnect()
})().catch(e => { console.error(e); process.exit(1) })
