import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { string } from './string.js'

describe('effect string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, 'Schema.String'],
    [{ type: 'string', format: 'uuid' }, 'Schema.String.check(Schema.isUUID())'],
    [
      { type: 'string', format: 'email' },
      'Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/))',
    ],
    [
      { type: 'string', format: 'uri' },
      'Schema.String.check(Schema.makeFilter((input)=>URL.canParse(input)))',
    ],
    [
      { type: 'string', format: 'date' },
      'Schema.String.check(Schema.isPattern(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$/))',
    ],
    [
      { type: 'string', format: 'date-time' },
      'Schema.String.check(Schema.isPattern(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$/))',
    ],
    [
      { type: 'string', minLength: 1 },
      'Schema.String.check(Schema.makeFilter((input)=>[...input].length>=1,{expected:"a string of at least 1 character"}))',
    ],
    [
      { type: 'string', maxLength: 100 },
      'Schema.String.check(Schema.makeFilter((input)=>[...input].length<=100,{expected:"a string of at most 100 characters"}))',
    ],
    [
      { type: 'string', minLength: 3, maxLength: 20 },
      'Schema.String.check(Schema.makeFilter((input)=>[...input].length>=3,{expected:"a string of at least 3 characters"}),Schema.makeFilter((input)=>[...input].length<=20,{expected:"a string of at most 20 characters"}))',
    ],
    [
      { type: 'string', minLength: 5, maxLength: 5 },
      'Schema.String.check(Schema.makeFilter((input)=>[...input].length===5,{expected:"a string of 5 characters"}))',
    ],
    [{ type: 'string', pattern: '^[a-z]+$' }, 'Schema.String.check(Schema.isPattern(/^[a-z]+$/))'],
  ])('string(%o) → %s', (input, expected) => {
    expect(string(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'string', 'x-error-message': 'Name is required' },
        'Schema.String.annotate({message:"Name is required"})',
      ],
      [
        { type: 'string', format: 'uuid', 'x-error-message': 'Invalid UUID' },
        'Schema.String.check(Schema.isUUID()).annotate({message:"Invalid UUID"})',
      ],
      [
        {
          type: 'string',
          pattern: '^[a-z]+$',
          'x-pattern-message': 'Only lowercase letters',
        },
        'Schema.String.check(Schema.isPattern(/^[a-z]+$/,{message:"Only lowercase letters"}))',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          'x-minLength-message': 'Min 3 chars',
          'x-maxLength-message': 'Max 20 chars',
        },
        'Schema.String.check(Schema.makeFilter((input)=>[...input].length>=3,{expected:"a string of at least 3 characters",message:"Min 3 chars"}),Schema.makeFilter((input)=>[...input].length<=20,{expected:"a string of at most 20 characters",message:"Max 20 chars"}))',
      ],
      [
        {
          type: 'string',
          minLength: 10,
          maxLength: 10,
          'x-minLength-message': 'Must be exactly 10 characters',
          'x-maxLength-message': 'Must be exactly 10 characters',
        },
        'Schema.String.check(Schema.makeFilter((input)=>[...input].length===10,{expected:"a string of 10 characters",message:"Must be exactly 10 characters"}))',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          'x-error-message': 'Invalid string',
          'x-minLength-message': 'Min 3 chars',
        },
        'Schema.String.check(Schema.makeFilter((input)=>[...input].length>=3,{expected:"a string of at least 3 characters",message:"Min 3 chars"})).annotate({message:"Invalid string"})',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })

  describe('FORMAT_MAP with length constraints', () => {
    it('should handle uuid with minLength', () => {
      expect(string({ type: 'string', format: 'uuid', minLength: 1 })).toBe(
        'Schema.String.check(Schema.isUUID(),Schema.makeFilter((input)=>[...input].length>=1,{expected:"a string of at least 1 character"}))',
      )
    })

    it('should handle ulid with minLength and maxLength', () => {
      expect(string({ type: 'string', format: 'ulid', minLength: 1, maxLength: 50 })).toBe(
        'Schema.String.check(Schema.isULID(),Schema.makeFilter((input)=>[...input].length>=1,{expected:"a string of at least 1 character"}),Schema.makeFilter((input)=>[...input].length<=50,{expected:"a string of at most 50 characters"}))',
      )
    })

    it('should handle uuid with length and error message', () => {
      expect(
        string({ type: 'string', format: 'uuid', minLength: 1, 'x-error-message': 'Bad' }),
      ).toBe(
        'Schema.String.check(Schema.isUUID(),Schema.makeFilter((input)=>[...input].length>=1,{expected:"a string of at least 1 character"})).annotate({message:"Bad"})',
      )
    })
  })

  describe('FORMAT_PIPE with pattern message', () => {
    it('should handle email with x-pattern-message', () => {
      expect(
        string({ type: 'string', format: 'email', 'x-pattern-message': 'Invalid email' }),
      ).toBe(
        'Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/,{message:"Invalid email"}))',
      )
    })

    it('should handle format without pattern message', () => {
      expect(string({ type: 'string', format: 'uri' })).toBe(
        'Schema.String.check(Schema.makeFilter((input)=>URL.canParse(input)))',
      )
    })

    it('should handle email with length constraints', () => {
      expect(string({ type: 'string', format: 'email', minLength: 5, maxLength: 100 })).toBe(
        'Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/),Schema.makeFilter((input)=>[...input].length>=5,{expected:"a string of at least 5 characters"}),Schema.makeFilter((input)=>[...input].length<=100,{expected:"a string of at most 100 characters"}))',
      )
    })
  })

  describe('declarative behavior extensions', () => {
    it('emits Schema.Trim for x-trim', () => {
      expect(string({ type: 'string', 'x-trim': true })).toBe('Schema.Trim')
    })

    it('emits Schema.Lowercase for x-toLowerCase', () => {
      expect(string({ type: 'string', 'x-toLowerCase': true })).toBe(
        'Schema.String.pipe(Schema.decodeTo(Schema.String,SchemaTransformation.toLowerCase()))',
      )
    })

    it('emits Schema.Uppercase for x-toUpperCase', () => {
      expect(string({ type: 'string', 'x-toUpperCase': true })).toBe(
        'Schema.String.pipe(Schema.decodeTo(Schema.String,SchemaTransformation.toUpperCase()))',
      )
    })

    it('falls back to Schema.String for x-normalize (no native Effect API)', () => {
      expect(string({ type: 'string', 'x-normalize': 'NFC' })).toBe(
        'Schema.String.pipe(Schema.decodeTo(Schema.String,SchemaTransformation.transform({decode:(input)=>input.normalize("NFC"),encode:(output)=>output})))',
      )
    })

    it('emits Schema.startsWith filter for x-startsWith', () => {
      expect(string({ type: 'string', 'x-startsWith': 'https://' })).toBe(
        'Schema.String.check(Schema.isStartsWith("https://"))',
      )
    })

    it('emits Schema.endsWith filter for x-endsWith', () => {
      expect(string({ type: 'string', 'x-endsWith': '.com' })).toBe(
        'Schema.String.check(Schema.isEndsWith(".com"))',
      )
    })

    it('emits Schema.includes filter for x-includes', () => {
      expect(string({ type: 'string', 'x-includes': '/api/' })).toBe(
        'Schema.String.check(Schema.isIncludes("/api/"))',
      )
    })

    it('combines transform base with content filters', () => {
      expect(string({ type: 'string', 'x-trim': true, 'x-startsWith': 'http' })).toBe(
        'Schema.Trim.check(Schema.isStartsWith("http"))',
      )
    })
  })
})
