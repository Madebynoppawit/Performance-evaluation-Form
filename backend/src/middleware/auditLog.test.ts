import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { describe, it } from 'node:test'
import { auditLog } from './auditLog'

function runAudit(method: string) {
  const originalInfo = console.info
  const logs: string[] = []
  console.info = (message: string) => logs.push(message)

  const req = {
    method,
    originalUrl: '/api/templates',
    requestId: 'req-12345678',
    ip: '127.0.0.1',
    get: () => 'node:test',
    user: { userId: 'admin-1', role: 'ADMIN' },
  } as unknown as Parameters<typeof auditLog>[0]

  const res = new EventEmitter() as Parameters<typeof auditLog>[1] & EventEmitter
  res.statusCode = 201

  auditLog(req, res, () => undefined)
  res.emit('finish')
  console.info = originalInfo
  return logs
}

describe('auditLog', () => {
  it('logs mutating requests with actor and request id', () => {
    const logs = runAudit('POST')

    assert.equal(logs.length, 1)
    const event = JSON.parse(logs[0])
    assert.equal(event.level, 'audit')
    assert.equal(event.requestId, 'req-12345678')
    assert.equal(event.actor.userId, 'admin-1')
  })

  it('does not log read-only requests', () => {
    const logs = runAudit('GET')
    assert.equal(logs.length, 0)
  })
})
