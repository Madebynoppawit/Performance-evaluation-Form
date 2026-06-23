import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateTempPassword } from './tempPassword'

const AMBIGUOUS = ['0', 'O', '1', 'l', 'I']

describe('generateTempPassword', () => {
  it('defaults to 10 characters and honours a custom length', () => {
    assert.equal(generateTempPassword().length, 10)
    assert.equal(generateTempPassword(8).length, 8)
    assert.equal(generateTempPassword(16).length, 16)
  })

  it('always satisfies the password policy (>=8 chars, >=1 uppercase, >=1 digit)', () => {
    for (let i = 0; i < 500; i++) {
      const pw = generateTempPassword()
      assert.ok(pw.length >= 8, `too short: ${pw}`)
      assert.match(pw, /[A-Z]/, `no uppercase: ${pw}`)
      assert.match(pw, /[0-9]/, `no digit: ${pw}`)
    }
  })

  it('never contains ambiguous characters (0/O/1/l/I)', () => {
    for (let i = 0; i < 500; i++) {
      const pw = generateTempPassword()
      for (const ch of AMBIGUOUS) {
        assert.ok(!pw.includes(ch), `contains ambiguous "${ch}": ${pw}`)
      }
    }
  })

  it('only uses the allowed character set', () => {
    const allowed = /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]+$/
    for (let i = 0; i < 200; i++) {
      assert.match(generateTempPassword(), allowed)
    }
  })

  it('does not put the guaranteed-class characters in a fixed position (shuffled)', () => {
    // If the first char were always uppercase, this set would have size 1.
    const firstChars = new Set(Array.from({ length: 200 }, () => generateTempPassword()[0]))
    assert.ok(firstChars.size > 1, 'first character never varies — shuffle may be broken')
  })

  it('returns unique values across many calls (no shared default)', () => {
    const seen = new Set(Array.from({ length: 1000 }, () => generateTempPassword()))
    // Allow a tiny theoretical collision margin, but effectively all must be unique.
    assert.ok(seen.size >= 999, `too many collisions: ${1000 - seen.size}`)
  })
})
