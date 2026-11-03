import { describe, expect, it } from 'vite-plus/test'
import { app as LengthMessageApp } from '../length-message/output.ts'

describe('elysia fixtures: length-message runtime', () => {
  it('valid: exactly 6 chars passes', async () => {
    const res = await LengthMessageApp.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        body: JSON.stringify({ code: 'abcdef' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(res.status).toBe(200)
  })

  it('invalid: empty code returns 422 with x-length-message as plain text', async () => {
    const res = await LengthMessageApp.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        body: JSON.stringify({ code: '' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(res.status).toBe(422)
    expect(await res.text()).toBe('Code must be exactly 6 characters')
  })
})
