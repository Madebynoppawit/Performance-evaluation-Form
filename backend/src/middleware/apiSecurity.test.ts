import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { noStoreApiResponses } from './apiSecurity'

describe('noStoreApiResponses', () => {
  it('sets no-store cache headers for API responses', () => {
    const headers: Record<string, string> = {}
    const res = {
      setHeader: (name: string, value: string) => {
        headers[name] = value
      },
    } as unknown as Parameters<typeof noStoreApiResponses>[1]

    noStoreApiResponses({} as Parameters<typeof noStoreApiResponses>[0], res, () => undefined)

    assert.equal(headers['Cache-Control'], 'no-store, no-cache, must-revalidate, private')
    assert.equal(headers.Pragma, 'no-cache')
  })
})
