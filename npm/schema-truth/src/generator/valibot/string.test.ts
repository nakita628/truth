import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { string } from './string.js'

describe('valibot string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, 'v.string()'],
    [{ type: 'string', format: 'email' }, 'v.pipe(v.string(),v.email())'],
    [
      { type: 'string', format: 'uuid' },
      'v.pipe(v.string(),v.regex(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/))',
    ],
    [{ type: 'string', format: 'uri' }, 'v.pipe(v.string(),v.url())'],
    [
      { type: 'string', format: 'date' },
      'v.pipe(v.string(),v.regex(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$/))',
    ],
    [
      { type: 'string', format: 'date-time' },
      'v.pipe(v.string(),v.regex(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$/))',
    ],
    [
      { type: 'string', format: 'time' },
      'v.pipe(v.string(),v.regex(/^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)?$/))',
    ],
    [{ type: 'string', format: 'ipv4' }, 'v.pipe(v.string(),v.ipv4())'],
    [{ type: 'string', format: 'ipv6' }, 'v.pipe(v.string(),v.ipv6())'],
    [{ type: 'string', format: 'emoji' }, 'v.pipe(v.string(),v.emoji())'],
    [{ type: 'string', format: 'base64' }, 'v.pipe(v.string(),v.base64())'],
    [{ type: 'string', minLength: 1 }, 'v.pipe(v.string(),v.minCodePoints(1))'],
    [{ type: 'string', maxLength: 100 }, 'v.pipe(v.string(),v.maxCodePoints(100))'],
    [
      { type: 'string', minLength: 3, maxLength: 20 },
      'v.pipe(v.string(),v.minCodePoints(3),v.maxCodePoints(20))',
    ],
    [{ type: 'string', minLength: 5, maxLength: 5 }, 'v.pipe(v.string(),v.codePoints(5))'],
    [{ type: 'string', pattern: '^[a-z]+$' }, 'v.pipe(v.string(),v.regex(/^[a-z]+$/))'],
  ])('string(%o) → %s', (input, expected) => {
    expect(string(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string', 'x-error-message': 'Name is required' }, 'v.string("Name is required")'],
      [
        { type: 'string', format: 'email', 'x-error-message': 'Invalid email' },
        'v.pipe(v.string("Invalid email"),v.email("Invalid email"))',
      ],
      [
        { type: 'string', format: 'date-time', 'x-error-message': 'Invalid timestamp' },
        'v.pipe(v.string("Invalid timestamp"),v.regex(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$/,"Invalid timestamp"))',
      ],
      [
        { type: 'string', format: 'time', 'x-error-message': 'Invalid time' },
        'v.pipe(v.string("Invalid time"),v.regex(/^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)?$/,"Invalid time"))',
      ],
      [
        {
          type: 'string',
          pattern: '^[a-z]+$',
          'x-pattern-message': 'Only lowercase letters',
        },
        'v.pipe(v.string(),v.regex(/^[a-z]+$/,"Only lowercase letters"))',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          'x-minLength-message': 'Min 3 chars',
          'x-maxLength-message': 'Max 20 chars',
        },
        'v.pipe(v.string(),v.minCodePoints(3,"Min 3 chars"),v.maxCodePoints(20,"Max 20 chars"))',
      ],
      [
        {
          type: 'string',
          minLength: 10,
          maxLength: 10,
          'x-minLength-message': 'Must be exactly 10 characters',
          'x-maxLength-message': 'Must be exactly 10 characters',
        },
        'v.pipe(v.string(),v.codePoints(10,"Must be exactly 10 characters"))',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })

  describe('declarative behavior extensions', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string', 'x-trim': true }, 'v.pipe(v.string(),v.trim())'],
      [{ type: 'string', 'x-toLowerCase': true }, 'v.pipe(v.string(),v.toLowerCase())'],
      [{ type: 'string', 'x-toUpperCase': true }, 'v.pipe(v.string(),v.toUpperCase())'],
      [{ type: 'string', 'x-normalize': 'NFC' }, 'v.pipe(v.string(),v.normalize("NFC"))'],
      [
        { type: 'string', 'x-startsWith': 'https://' },
        'v.pipe(v.string(),v.startsWith("https://"))',
      ],
      [{ type: 'string', 'x-endsWith': '.com' }, 'v.pipe(v.string(),v.endsWith(".com"))'],
      [{ type: 'string', 'x-includes': '/api/' }, 'v.pipe(v.string(),v.includes("/api/"))'],
      [
        { type: 'string', 'x-trim': true, 'x-toLowerCase': true },
        'v.pipe(v.string(),v.trim(),v.toLowerCase())',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })
})
