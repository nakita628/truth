import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { string } from './string.js'

describe('arktype string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, '"string"'],
    [{ type: 'string', format: 'email' }, '"string.email"'],
    [{ type: 'string', format: 'uuid' }, '"string.uuid"'],
    [
      { type: 'string', format: 'date' },
      'type(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$/)',
    ],
    [
      { type: 'string', format: 'date-time' },
      'type(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$/)',
    ],
    [
      { type: 'string', minLength: 3 },
      'type("string").narrow((data, ctx) => [...data].length >= 3 || ctx.mustBe("at least 3 characters"))',
    ],
    [
      { type: 'string', maxLength: 20 },
      'type("string").narrow((data, ctx) => [...data].length <= 20 || ctx.mustBe("at most 20 characters"))',
    ],
    [
      { type: 'string', minLength: 3, maxLength: 20 },
      'type("string").narrow((data, ctx) => [...data].length >= 3 || ctx.mustBe("at least 3 characters")).narrow((data, ctx) => [...data].length <= 20 || ctx.mustBe("at most 20 characters"))',
    ],
    [
      { type: 'string', minLength: 5, maxLength: 5 },
      'type("string").narrow((data, ctx) => [...data].length === 5 || ctx.mustBe("exactly 5 characters"))',
    ],
    [{ type: 'string', pattern: '^[a-z]+$' }, 'type("string").and(/^[a-z]+$/)'],
  ])('string(%o) → %s', (input, expected) => {
    expect(string(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'string', 'x-error-message': 'Name is required' },
        'type("string").describe("Name is required")',
      ],
      [
        { type: 'string', format: 'email', 'x-error-message': 'Invalid email' },
        'type("string.email").describe("Invalid email")',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          'x-error-message': 'Invalid name length',
        },
        'type("string").narrow((data, ctx) => [...data].length >= 3 || ctx.mustBe("Invalid name length")).narrow((data, ctx) => [...data].length <= 20 || ctx.mustBe("Invalid name length")).describe("Invalid name length")',
      ],
      [
        {
          type: 'string',
          minLength: 5,
          maxLength: 5,
          'x-error-message': 'Exact 5',
        },
        'type("string").narrow((data, ctx) => [...data].length === 5 || ctx.mustBe("exactly 5 characters")).describe("Exact 5")',
      ],
      [
        {
          type: 'string',
          pattern: '^[a-z]+$',
          'x-error-message': 'Only lowercase',
        },
        'type("string").and(/^[a-z]+$/).describe("Only lowercase")',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })

  describe('declarative behavior extensions', () => {
    it('emits .pipe morph for x-trim', () => {
      expect(string({ type: 'string', 'x-trim': true })).toBe('type("string.trim")')
    })

    it('emits .pipe morph for x-toLowerCase', () => {
      expect(string({ type: 'string', 'x-toLowerCase': true })).toBe('type("string.lower")')
    })

    it('emits .pipe morph for x-normalize', () => {
      expect(string({ type: 'string', 'x-normalize': 'NFC' })).toBe('type("string.normalize.NFC")')
    })

    it('emits .narrow with ctx.mustBe for x-startsWith', () => {
      expect(string({ type: 'string', 'x-startsWith': 'https://' })).toBe(
        'type("string").narrow((data: string, ctx) => data.startsWith("https://") || ctx.mustBe("must start with \\"https://\\""))',
      )
    })

    it('chains pipe morph and narrow filter', () => {
      expect(string({ type: 'string', 'x-trim': true, 'x-startsWith': 'http' })).toBe(
        'type("string.trim").narrow((data: string, ctx) => data.startsWith("http") || ctx.mustBe("must start with \\"http\\""))',
      )
    })
  })
})
