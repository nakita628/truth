import { describe, expect, it } from 'vite-plus/test'

import { type } from './type.js'

describe('valibot type', () => {
  it('should return empty string for undefined schema', () => {
    expect(type(undefined)).toBe('')
  })

  describe('$ref cases', () => {
    it('should handle self reference #', () => {
      expect(type({ $ref: '#' }, 'Schema')).toBe('v.InferOutput<typeof Schema>')
    })

    it('should handle empty reference as unknown (falsy)', () => {
      expect(type({ $ref: '' }, 'Schema')).toBe('unknown')
    })

    it('should handle self reference with custom name', () => {
      expect(type({ $ref: '#' }, 'Node')).toBe('v.InferOutput<typeof Node>')
    })

    it('should handle #/definitions/ reference', () => {
      expect(type({ $ref: '#/definitions/User' }, 'Schema')).toBe('_User')
    })

    it('should handle #/components/schemas/ reference', () => {
      expect(type({ $ref: '#/components/schemas/User' }, 'Schema')).toBe('_User')
    })

    it('should handle #/$defs/ reference', () => {
      expect(type({ $ref: '#/$defs/User' }, 'Schema')).toBe('_User')
    })

    it('should handle #fragment reference without slash', () => {
      expect(type({ $ref: '#animal' }, 'Schema')).toBe('_Animal')
    })

    it('should return unknown for #/invalid/path reference', () => {
      expect(type({ $ref: '#/invalid/path' }, 'Schema')).toBe('unknown')
    })

    it('should handle kebab-case definition name', () => {
      expect(type({ $ref: '#/definitions/user-profile' }, 'Schema')).toBe('_User-profile')
    })
  })

  describe('combinators', () => {
    it('should handle oneOf', () => {
      expect(type({ oneOf: [{ type: 'string' }, { type: 'number' }] })).toBe('(string | number)')
    })

    it('should handle anyOf', () => {
      expect(type({ anyOf: [{ type: 'string' }, { type: 'number' }] })).toBe('(string | number)')
    })

    it('should handle allOf', () => {
      expect(
        type({
          allOf: [
            { type: 'object', properties: { name: { type: 'string' } } },
            { type: 'object', properties: { age: { type: 'number' } } },
          ],
        }),
      ).toBe('({name?: string} & {age?: number})')
    })

    it('should handle not', () => {
      expect(type({ not: { type: 'string' } })).toBe('unknown')
    })
  })

  describe('const', () => {
    it('should handle string const', () => {
      expect(type({ const: 'hello' })).toBe('"hello"')
    })

    it('should handle number const', () => {
      expect(type({ const: 42 })).toBe('42')
    })

    it('should handle boolean const', () => {
      expect(type({ const: true })).toBe('true')
    })

    it('should handle false const', () => {
      expect(type({ const: false })).toBe('false')
    })

    it('should handle zero const', () => {
      expect(type({ const: 0 })).toBe('0')
    })

    it('should handle null const', () => {
      expect(type({ const: null })).toBe('null')
    })
  })

  describe('enum', () => {
    it('should handle single string enum', () => {
      expect(type({ enum: ['hello'] })).toBe('"hello"')
    })

    it('should handle single number enum', () => {
      expect(type({ enum: [42] })).toBe('42')
    })

    it('should handle multiple string enum', () => {
      expect(type({ enum: ['a', 'b', 'c'] })).toBe('("a" | "b" | "c")')
    })

    it('should handle mixed enum', () => {
      expect(type({ enum: ['hello', 42, true] })).toBe('("hello" | 42 | true)')
    })

    it('should handle single boolean enum', () => {
      expect(type({ enum: [false] })).toBe('false')
    })
  })

  describe('primitive types', () => {
    it('should handle string', () => {
      expect(type({ type: 'string' })).toBe('string')
    })

    it('should handle number', () => {
      expect(type({ type: 'number' })).toBe('number')
    })

    it('should handle integer', () => {
      expect(type({ type: 'integer' })).toBe('number')
    })

    it('should handle boolean', () => {
      expect(type({ type: 'boolean' })).toBe('boolean')
    })

    it('should handle date', () => {
      expect(type({ type: 'date' })).toBe('Date')
    })

    it('should handle null', () => {
      expect(type({ type: 'null' })).toBe('null')
    })
  })

  describe('array', () => {
    it('should handle array with items', () => {
      expect(type({ type: 'array', items: { type: 'string' } })).toBe('string[]')
    })

    it('should handle array without items', () => {
      expect(type({ type: 'array' })).toBe('unknown[]')
    })

    it('should handle nested array', () => {
      expect(type({ type: 'array', items: { type: 'array', items: { type: 'number' } } })).toBe(
        'number[][]',
      )
    })
  })

  describe('object', () => {
    it('should handle object with properties', () => {
      expect(
        type({
          type: 'object',
          properties: { name: { type: 'string' }, age: { type: 'number' } },
          required: ['name'],
        }),
      ).toBe('{name: string; age?: number}')
    })

    it('should handle object without properties', () => {
      expect(type({ type: 'object' })).toBe('{ [key: string]: unknown }')
    })

    it('should handle additionalProperties: true', () => {
      expect(type({ type: 'object', additionalProperties: true })).toBe(
        '{ [key: string]: unknown }',
      )
    })

    it('should handle additionalProperties: false (falsy, falls through to default)', () => {
      expect(type({ type: 'object', additionalProperties: false })).toBe(
        '{ [key: string]: unknown }',
      )
    })

    it('should handle additionalProperties with schema', () => {
      expect(type({ type: 'object', additionalProperties: { type: 'string' } })).toBe(
        '{ [key: string]: string }',
      )
    })

    it('should handle object without properties and without additionalProperties', () => {
      expect(type({ properties: undefined, type: 'object' })).toBe('{ [key: string]: unknown }')
    })

    it('should handle special character keys', () => {
      expect(
        type({
          type: 'object',
          properties: { 'x-value': { type: 'string' }, normal: { type: 'number' } },
        }),
      ).toBe('{"x-value"?: string; normal?: number}')
    })

    it('should handle keys starting with number', () => {
      expect(type({ type: 'object', properties: { '1st': { type: 'string' } } })).toBe(
        '{"1st"?: string}',
      )
    })
  })

  describe('allOf intersection filtering', () => {
    it('should read a null member as null beside the intersection', () => {
      expect(
        type({
          allOf: [{ type: 'object', properties: { name: { type: 'string' } } }, { type: 'null' }],
        }),
      ).toBe('({name?: string} | null)')
    })

    it('should read a nullable: true only member as null beside the intersection', () => {
      expect(
        type({
          allOf: [{ type: 'object', properties: { name: { type: 'string' } } }, { nullable: true }],
        }),
      ).toBe('({name?: string} | null)')
    })

    it('should exclude default-only object from intersection', () => {
      expect(
        type({
          allOf: [
            { type: 'object', properties: { name: { type: 'string' } } },
            { default: 'hello' },
          ],
        }),
      ).toBe('{name?: string}')
    })

    it('should exclude const-only object from intersection', () => {
      expect(
        type({
          allOf: [{ type: 'object', properties: { name: { type: 'string' } } }, { const: 'hello' }],
        }),
      ).toBe('{name?: string}')
    })

    it('should return unknown for empty intersection', () => {
      expect(type({ allOf: [{ type: 'null' }, { nullable: true }] })).toBe('unknown')
    })

    it('should handle single remaining type after filter', () => {
      expect(type({ allOf: [{ type: 'string' }, { default: 'x' }] })).toBe('string')
    })
  })

  describe('unknown fallback', () => {
    it('should return unknown for empty schema', () => {
      expect(type({})).toBe('unknown')
    })

    it('should return unknown for schema with only description', () => {
      expect(type({ description: 'something' })).toBe('unknown')
    })
  })

  describe('complex nested cases', () => {
    it('should handle nested object with array', () => {
      expect(
        type({
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name'],
              },
            },
          },
        }),
      ).toBe('{users?: {name: string}[]}')
    })

    it('should handle union with references', () => {
      expect(
        type(
          { oneOf: [{ $ref: '#/definitions/User' }, { $ref: '#/definitions/Admin' }] },
          'Schema',
        ),
      ).toBe('(_User | _Admin)')
    })

    it('should handle deeply nested refs in allOf', () => {
      expect(
        type({
          allOf: [
            { type: 'object', properties: { a: { $ref: '#/definitions/A' } } },
            { type: 'object', properties: { b: { $ref: '#/definitions/B' } } },
          ],
        }),
      ).toBe('({a?: _A} & {b?: _B})')
    })
  })
})
