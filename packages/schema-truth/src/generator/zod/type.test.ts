import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { type } from './type.js'

describe('type', () => {
  it('should return empty string for undefined schema', () => {
    expect(type(undefined)).toBe('')
  })

  describe('$ref cases', () => {
    it('should handle self reference', () => {
      expect(type({ $ref: '#' }, 'Schema')).toBe('z.infer<typeof Schema>')
    })

    it('should handle empty reference', () => {
      expect(type({ $ref: '' }, 'Schema')).toBe('unknown')
    })

    it('should handle #fragment reference without slash', () => {
      expect(type({ $ref: '#animal' }, 'Schema')).toBe('_Animal')
    })

    it('should handle external file reference with fragment', () => {
      expect(type({ $ref: './other.json#/definitions/User' }, 'Schema')).toBe('unknown')
    })

    it('should handle HTTP reference', () => {
      expect(type({ $ref: 'https://example.com/schema.json' }, 'Schema')).toBe('unknown')
    })

    it('should handle HTTP reference with fragment', () => {
      expect(type({ $ref: 'https://example.com/schema.json#/definitions/User' }, 'Schema')).toBe(
        'unknown',
      )
    })

    it('should handle self reference with custom name', () => {
      expect(type({ $ref: '#/definitions/Node' }, 'Node')).toBe('_Node')
    })

    it('should handle other references', () => {
      expect(type({ $ref: '#/definitions/User' }, 'Schema')).toBe('_User')
    })

    it('should handle components/schemas reference', () => {
      expect(type({ $ref: '#/components/schemas/User' }, 'Schema')).toBe('_User')
    })

    it('should handle $defs reference', () => {
      expect(type({ $ref: '#/$defs/User' }, 'Schema')).toBe('_User')
    })

    it('should return unknown for invalid reference', () => {
      expect(type({ $ref: '#/invalid/path' }, 'Schema')).toBe('unknown')
    })
  })

  describe('combinators', () => {
    it('should handle oneOf', () => {
      expect(
        type({
          oneOf: [{ type: 'string' }, { type: 'number' }],
        }),
      ).toBe('(string | number)')
    })

    it('should handle anyOf', () => {
      expect(
        type({
          anyOf: [{ type: 'string' }, { type: 'number' }],
        }),
      ).toBe('(string | number)')
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
  })

  describe('enum', () => {
    it('should handle single string enum', () => {
      expect(type({ enum: ['hello'] })).toBe('"hello"')
    })

    it('should handle single number enum', () => {
      expect(type({ enum: [42] })).toBe('42')
    })

    it('should handle multiple string enum', () => {
      expect(type({ enum: ['hello', 'world'] })).toBe('("hello" | "world")')
    })

    it('should handle mixed enum', () => {
      expect(type({ enum: ['hello', 42, true] })).toBe('("hello" | 42 | true)')
    })
  })

  describe('primitive types', () => {
    it('should handle string type', () => {
      expect(type({ type: 'string' })).toBe('string')
    })

    it('should handle number type', () => {
      expect(type({ type: 'number' })).toBe('number')
    })

    it('should handle integer type', () => {
      expect(type({ type: 'integer' })).toBe('number')
    })

    it('should handle boolean type', () => {
      expect(type({ type: 'boolean' })).toBe('boolean')
    })

    it('should handle date type', () => {
      expect(type({ type: 'date' })).toBe('Date')
    })

    it('should handle null type', () => {
      expect(type({ type: 'null' })).toBe('null')
    })

    it('should add null for a nullable type (#403)', () => {
      expect(type({ type: 'integer', nullable: true })).toBe('(number | null)')
      expect(type({ type: ['string', 'null'] })).toBe('(string | null)')
      expect(type({ $ref: '#/$defs/User', nullable: true })).toBe('(_User | null)')
    })

    it('should handle multiple types', () => {
      expect(type({ type: ['string', 'number'] })).toBe('(string | number)')
    })

    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer', format: 'int64' }, 'bigint'],
      [{ type: 'integer', format: 'uint64' }, 'bigint'],
      [{ type: 'integer', format: 'bigint' }, 'bigint'],
      [{ type: 'integer', format: 'int64', enum: [1, 2] }, '(1n | 2n)'],
      [{ type: 'integer', format: 'int64', const: 1 }, '1n'],
      [{ type: ['number', 'boolean'] }, '(number | boolean)'],
      [{ type: ['integer', 'number'] }, 'number'],
    ])('type(%o) → %s', (schema, expected) => {
      expect(type(schema)).toBe(expected)
    })
  })

  describe('array', () => {
    it('should handle array with items', () => {
      expect(
        type({
          type: 'array',
          items: { type: 'string' },
        }),
      ).toBe('string[]')
    })

    it('should handle array without items', () => {
      expect(type({ type: 'array' })).toBe('unknown[]')
    })
  })

  describe('object', () => {
    it('should handle object with properties', () => {
      expect(
        type({
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name'],
        }),
      ).toBe('{name: string; age?: number}')
    })

    it('should handle object without properties', () => {
      expect(type({ type: 'object' })).toBe('{ [key: string]: unknown }')
    })

    it('should handle object with additionalProperties boolean true', () => {
      expect(
        type({
          type: 'object',
          additionalProperties: true,
        }),
      ).toBe('{ [key: string]: unknown }')
    })

    it('should handle object with additionalProperties boolean false', () => {
      expect(
        type({
          type: 'object',
          additionalProperties: false,
        }),
      ).toBe('{ [key: string]: unknown }')
    })

    it('should handle object with additionalProperties schema', () => {
      expect(
        type({
          type: 'object',
          additionalProperties: { type: 'string' },
        }),
      ).toBe('{ [key: string]: string }')
    })

    it('should handle property names with special characters', () => {
      expect(
        type({
          type: 'object',
          properties: {
            'user-name': { type: 'string' },
            'user.age': { type: 'number' },
          },
        }),
      ).toBe('{"user-name"?: string; "user.age"?: number}')
    })

    it('should handle property names starting with number', () => {
      expect(
        type({
          type: 'object',
          properties: {
            '1st': { type: 'string' },
          },
        }),
      ).toBe('{"1st"?: string}')
    })
  })

  describe('allOf intersection', () => {
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

    it('should exclude simple properties with default', () => {
      expect(
        type({
          allOf: [
            { type: 'object', properties: { name: { type: 'string' } } },
            { default: 'hello' },
          ],
        }),
      ).toBe('{name?: string}')
    })

    it('should exclude simple properties with const', () => {
      expect(
        type({
          allOf: [{ type: 'object', properties: { name: { type: 'string' } } }, { const: 'hello' }],
        }),
      ).toBe('{name?: string}')
    })

    it('should return unknown for empty intersection', () => {
      expect(
        type({
          allOf: [{ type: 'null' }, { nullable: true }],
        }),
      ).toBe('unknown')
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
                properties: {
                  name: { type: 'string' },
                  age: { type: 'number' },
                },
              },
            },
          },
        }),
      ).toBe('{users?: {name?: string; age?: number}[]}')
    })

    it('should handle union with references', () => {
      expect(
        type(
          {
            oneOf: [{ $ref: '#/definitions/User' }, { $ref: '#/definitions/Admin' }],
          },
          'Schema',
        ),
      ).toBe('(_User | _Admin)')
    })
  })
})
