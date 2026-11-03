import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { string } from './string.js'

describe('typebox string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, 'Type.String()'],
    [{ type: 'string', minLength: 1 }, 'Type.String({minLength:1})'],
    [{ type: 'string', maxLength: 100 }, 'Type.String({maxLength:100})'],
    [{ type: 'string', minLength: 3, maxLength: 20 }, 'Type.String({minLength:3,maxLength:20})'],
    [{ type: 'string', minLength: 5, maxLength: 5 }, 'Type.String({minLength:5,maxLength:5})'],
    [{ type: 'string', pattern: '^\\w+$' }, 'Type.String({pattern:"^\\\\w+$"})'],
    [{ type: 'string', format: 'email' }, 'Type.String({format:"email"})'],
    [{ type: 'string', format: 'uuid' }, 'Type.String({format:"uuid"})'],
    [{ type: 'string', format: 'uri' }, 'Type.String({format:"uri"})'],
    [{ type: 'string', format: 'ipv4' }, 'Type.String({format:"ipv4"})'],
    [{ type: 'string', format: 'ipv6' }, 'Type.String({format:"ipv6"})'],
    [{ type: 'string', format: 'date-time' }, 'Type.String({format:"date-time"})'],
    [{ type: 'string', format: 'date' }, 'Type.String({format:"date"})'],
    [{ type: 'string', format: 'time' }, 'Type.String({format:"time"})'],
  ])('string(%o) → %s', (input, expected) => {
    expect(string(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'string', 'x-error-message': 'Name is required' },
        'Type.String({errorMessage:"Name is required"})',
      ],
      [
        { type: 'string', format: 'email', 'x-error-message': 'Invalid email' },
        'Type.String({format:"email",errorMessage:"Invalid email"})',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          'x-error-message': 'Invalid name length',
        },
        'Type.String({minLength:3,maxLength:20,errorMessage:"Invalid name length"})',
      ],
      [
        {
          type: 'string',
          pattern: '^[a-z]+$',
          'x-error-message': 'Only lowercase',
        },
        'Type.String({pattern:"^[a-z]+$",errorMessage:"Only lowercase"})',
      ],
      [
        {
          type: 'string',
          format: 'uuid',
          'x-error-message': 'Invalid UUID',
        },
        'Type.String({format:"uuid",errorMessage:"Invalid UUID"})',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })

  describe('host ref', () => {
    it('puts ref first on Type.String when other options are present', () => {
      expect(string({ type: 'string', minLength: 1 }, 'Name')).toBe(
        'Type.String({ref:"Name",minLength:1})',
      )
    })

    it('puts ref on the Type.String inside Codec, not on Codec', () => {
      expect(string({ type: 'string', 'x-trim': true }, 'Name')).toBe(
        'Codec(Type.String({ref:"Name"})).Decode((value: string) => value.trim()).Encode((value: string) => value)',
      )
    })
  })

  describe('declarative behavior extensions', () => {
    it('wraps Type.String with Type.Transform for x-trim', () => {
      expect(string({ type: 'string', 'x-trim': true })).toBe(
        'Codec(Type.String()).Decode((value: string) => value.trim()).Encode((value: string) => value)',
      )
    })

    it('chains multiple string transforms', () => {
      expect(string({ type: 'string', 'x-trim': true, 'x-toLowerCase': true })).toBe(
        'Codec(Type.String()).Decode((value: string) => value.trim().toLowerCase()).Encode((value: string) => value)',
      )
    })

    it('emits x-normalize via Transform.Decode', () => {
      expect(string({ type: 'string', 'x-normalize': 'NFC' })).toBe(
        'Codec(Type.String()).Decode((value: string) => value.normalize("NFC")).Encode((value: string) => value)',
      )
    })

    it('emits x-startsWith as ajv-runtime pattern annotation', () => {
      expect(string({ type: 'string', 'x-startsWith': 'https://' })).toBe(
        'Type.String({pattern:"^https://"})',
      )
    })

    it('emits x-includes as ajv-runtime pattern annotation', () => {
      expect(string({ type: 'string', 'x-includes': '/api/' })).toBe(
        'Type.String({pattern:"/api/"})',
      )
    })

    it('escapes regex metacharacters in x-startsWith / x-endsWith', () => {
      expect(string({ type: 'string', 'x-endsWith': '.com' })).toBe(
        'Type.String({pattern:"\\\\.com$"})',
      )
    })
  })
})
