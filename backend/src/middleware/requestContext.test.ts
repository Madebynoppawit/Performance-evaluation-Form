import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { requestContext } from './requestContext'

function runMiddleware(header?: string) {
  const headers: Record<string, string> = {}
  if (header) headers['x-request-id'] = header
  const req = { headers } as Parameters<typeof requestContext>[0]
  const responseHeaders: Record<string, string> = {}
  const res = {
    setHeader: (name: string, value: string) => {
      responseHeaders[name] = value
    },
  } as unknown as Parameters<typeof requestContext>[1]

  requestContext(req, res, () => undefined)
  return { req, responseHeaders }
}

describe('requestContext', () => {
  it('keeps a valid incoming request id', () => {
    const { req, responseHeaders } = runMiddleware('web-request-123')

    assert.equal(req.requestId, 'web-request-123')
    assert.equal(responseHeaders['X-Request-Id'], 'web-request-123')
    assert.ok(req.startedAt)
  })

  it('generates a safe request id when the incoming value is invalid', () => {
    const { req, responseHeaders } = runMiddleware('bad id with spaces')

    assert.notEqual(req.requestId, 'bad id with spaces')
    assert.equal(responseHeaders['X-Request-Id'], req.requestId)
    assert.ok(req.requestId)
  })
})
