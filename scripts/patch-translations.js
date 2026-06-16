/**
 * Patch translations.ts — add missing i18n keys for v1.2.1
 * Run with: node scripts/patch-translations.js
 */
const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', 'frontend', 'src', 'i18n', 'translations.ts')
let lines = fs.readFileSync(FILE, 'utf8').split('\n')

/** Insert `newLines` AFTER the line at index `afterIdx` */
function insertAfter(afterIdx, newLines) {
  lines.splice(afterIdx + 1, 0, ...newLines)
}

// ─── Keys to insert ────────────────────────────────────────────────────────────
// Format: [anchorLine (0-based), lines to insert after it]
// IMPORTANT: process in REVERSE order so earlier insertions don't shift later indices

function findAnchor(partial, minIdx, maxIdx) {
  for (let i = minIdx; i <= maxIdx; i++) {
    if (lines[i] && lines[i].includes(partial)) return i
  }
  throw new Error(`Anchor not found: "${partial}" between lines ${minIdx}–${maxIdx}`)
}

// Build insertion list (will sort by index descending before applying)
const insertions = []

// ── EN ──────────────────────────────────────────────────────────────────────────
{
  // cp.* after acc.passwordMismatch (EN)
  const idx = findAnchor("'acc.passwordMismatch': 'Passwords do not match'", 370, 400)
  insertions.push([idx, [
    "    'cp.newPassword': 'New Password',",
    "    'cp.passwordHint': 'At least 8 chars, 1 uppercase, 1 number',",
    "    'cp.confirmPassword': 'Confirm Password',",
    "    'cp.confirmHint': 'Re-enter new password',",
  ]])
}
{
  // ak.selectDate after ak.acknowledge (EN)
  const idx = findAnchor("'ak.acknowledge': 'Acknowledge'", 520, 540)
  insertions.push([idx, ["    'ak.selectDate': 'Select signing date',"]])
}
{
  // rp.loadFailed + filterCycle after rp.unknown (EN)
  const idx = findAnchor("'rp.unknown': 'Unknown'", 558, 580)
  insertions.push([idx, [
    "    'rp.loadFailed': 'Could not load reports',",
    "    'rp.loadFailedDesc': 'Check your connection and try again.',",
    "    'rp.filterCycle': 'Filter by cycle',",
    "    'rp.allCycles': 'All cycles',",
  ]])
}
{
  // cal.* — insert after rp.* block. Use rp.needsAttention as anchor (EN)
  const idx = findAnchor("'rp.needsAttention': 'Needs attention'", 556, 600)
  insertions.push([idx, [
    "    'cal.loadFailed': 'Could not load calibration data',",
    "    'cal.loadFailedDesc': 'Check your connection and try again.',",
  ]])
}

// ── TH ──────────────────────────────────────────────────────────────────────────
{
  const idx = findAnchor("'acc.passwordMismatch':", 955, 985)
  insertions.push([idx, [
    "    'cp.newPassword': 'รหัสผ่านใหม่',",
    "    'cp.passwordHint': 'อย่างน้อย 8 ตัวอักษร 1 ตัวพิมพ์ใหญ่ 1 ตัวเลข',",
    "    'cp.confirmPassword': 'ยืนยันรหัสผ่าน',",
    "    'cp.confirmHint': 'กรอกรหัสผ่านอีกครั้ง',",
  ]])
}
{
  const idx = findAnchor("'ak.acknowledge':", 1095, 1115)
  insertions.push([idx, ["    'ak.selectDate': 'เลือกวันที่ลงนาม',"]])
}
{
  const idx = findAnchor("'rp.unknown':", 1133, 1155)
  insertions.push([idx, [
    "    'rp.loadFailed': 'ไม่สามารถโหลดรายงานได้',",
    "    'rp.loadFailedDesc': 'ตรวจสอบการเชื่อมต่อและลองอีกครั้ง',",
    "    'rp.filterCycle': 'กรองตามรอบ',",
    "    'rp.allCycles': 'ทุกรอบ',",
  ]])
}
{
  const idx = findAnchor("'rp.needsAttention':", 1130, 1160)
  insertions.push([idx, [
    "    'cal.loadFailed': 'ไม่สามารถโหลดข้อมูลการปรับเทียบได้',",
    "    'cal.loadFailedDesc': 'ตรวจสอบการเชื่อมต่อและลองอีกครั้ง',",
  ]])
}

// ── FR ──────────────────────────────────────────────────────────────────────────
{
  const idx = findAnchor("'acc.passwordMismatch':", 1528, 1560)
  insertions.push([idx, [
    "    'cp.newPassword': 'Nouveau mot de passe',",
    "    'cp.passwordHint': 'Au moins 8 caractères, 1 majuscule, 1 chiffre',",
    "    'cp.confirmPassword': 'Confirmer le mot de passe',",
    "    'cp.confirmHint': 'Ressaisir le mot de passe',",
  ]])
}
{
  const idx = findAnchor("'ak.acknowledge':", 1668, 1690)
  insertions.push([idx, ["    'ak.selectDate': 'Sélectionner la date de signature',"]])
}
{
  const idx = findAnchor("'rp.unknown':", 1705, 1730)
  insertions.push([idx, [
    "    'rp.loadFailed': 'Impossible de charger les rapports',",
    "    'rp.loadFailedDesc': 'Vérifiez votre connexion et réessayez.',",
    "    'rp.filterCycle': 'Filtrer par cycle',",
    "    'rp.allCycles': 'Tous les cycles',",
  ]])
}
{
  const idx = findAnchor("'rp.needsAttention':", 1703, 1730)
  insertions.push([idx, [
    "    'cal.loadFailed': 'Impossible de charger les données de calibration',",
    "    'cal.loadFailedDesc': 'Vérifiez votre connexion et réessayez.',",
  ]])
}

// ── Apply in REVERSE order (highest index first) ────────────────────────────────
insertions.sort((a, b) => b[0] - a[0])
for (const [idx, newLines] of insertions) {
  insertAfter(idx, newLines)
}

fs.writeFileSync(FILE, lines.join('\n'), 'utf8')
console.log('Done. Total lines now:', lines.length)
