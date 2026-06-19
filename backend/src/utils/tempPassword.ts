import { randomInt } from 'crypto'

// Human-friendly character sets — ambiguous glyphs (0/O, 1/l/I) are excluded so
// a printed/typed temporary password is not misread.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnpqrstuvwxyz'
const DIGIT = '23456789'
const ALL = UPPER + LOWER + DIGIT

const pick = (set: string) => set[randomInt(set.length)]

/** Generate a random, policy-compliant temporary password (≥1 uppercase, ≥1
    digit, ≥8 chars). Each call returns a unique value — there is no shared
    default, so knowing one account's temp password reveals nothing about others. */
export function generateTempPassword(length = 10): string {
  const chars = [pick(UPPER), pick(DIGIT), pick(LOWER)]
  for (let i = chars.length; i < length; i++) chars.push(pick(ALL))
  // Fisher–Yates shuffle so the guaranteed-class characters aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
