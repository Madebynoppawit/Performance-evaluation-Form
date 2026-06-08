import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import request from 'supertest'
import { createApp } from '../app'

const app = createApp()

describe('Swagger API documentation', () => {
  it('serves the OpenAPI document', async () => {
    const res = await request(app).get('/api/openapi.json')

    assert.equal(res.status, 200)
    assert.equal(res.body.openapi, '3.0.3')
    assert.equal(res.body.info.title, 'AMW Performance Evaluation API')
    assert.ok(res.body.paths['/evaluations'])
  })

  it('serves Swagger UI', async () => {
    const res = await request(app).get('/api/docs/')

    assert.equal(res.status, 200)
    assert.match(res.text, /swagger-ui/)
  })
})
