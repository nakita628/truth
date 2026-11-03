import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import { sanitizeSchema } from './sanitize.js'

/** A document read from the wild, whose keyword values are of any type. */
function wild(document: unknown): JSONSchema {
  return document as JSONSchema
}

describe('sanitizeSchema', () => {
  it('leaves out a keyword whose value has the wrong type (Revolut)', () => {
    expect(
      sanitizeSchema(
        wild({
          type: 'string',
          minimum: "'created_at' - 21 days",
          maxLength: 'ten',
          minLength: null,
          pattern: 123,
          format: 5,
          readOnly: 'true',
          description: 'kept',
        }),
      ),
    ).toStrictEqual({ type: 'string', description: 'kept' })
  })

  it('keeps a value of the right type as it is', () => {
    const schema: JSONSchema = {
      type: ['integer', 'null'],
      minimum: 0,
      exclusiveMaximum: true,
      multipleOf: 2,
      enum: [0, 2, null],
      default: 'any value',
      const: { a: [1] },
    }
    expect(sanitizeSchema(schema)).toStrictEqual(schema)
  })

  it('leaves out a count that is negative or fractional, and a multipleOf that is not positive', () => {
    expect(
      sanitizeSchema(wild({ type: 'array', minItems: -1, maxItems: 1.5, multipleOf: 0 })),
    ).toStrictEqual({ type: 'array' })
  })

  it('leaves out a discriminator without propertyName, and keeps only the string refs of its mapping', () => {
    expect(
      sanitizeSchema(wild({ discriminator: { mapping: { UK: '#/$defs/UK' } } })),
    ).toStrictEqual({})
    expect(
      sanitizeSchema(
        wild({ discriminator: { propertyName: 'kind', mapping: { a: '#/$defs/A', b: 1 } } }),
      ),
    ).toStrictEqual({ discriminator: { propertyName: 'kind', mapping: { a: '#/$defs/A' } } })
  })

  it('reads `required: true` on a property as no list, and a YAML literal in the list as a name', () => {
    expect(
      sanitizeSchema(
        wild({
          type: 'object',
          required: ['a', null, true],
          properties: { a: { type: 'string', required: true } },
        }),
      ),
    ).toStrictEqual({
      type: 'object',
      required: ['a', 'null', 'true'],
      properties: { a: { type: 'string' } },
    })
  })

  it('cleans every schema position, and keeps a schema map member that is no schema as any value', () => {
    expect(
      sanitizeSchema(
        wild({
          allOf: { type: 'string' },
          anyOf: [{ type: 'string', maxLength: 'x' }, 'nope', true],
          items: null,
          properties: { a: 'string', b: { minimum: '1' } },
          $defs: { D: { enum: 'a' } },
        }),
      ),
    ).toStrictEqual({
      anyOf: [{ type: 'string' }, true],
      properties: { a: {}, b: {} },
      $defs: { D: {} },
    })
  })

  it('reads a 3.0 map of Example Objects as the list of their values', () => {
    expect(
      sanitizeSchema(wild({ examples: { a: { value: 1 }, b: { summary: 's' } } })),
    ).toStrictEqual({ examples: [1] })
  })

  it('does not read a property named like a keyword, data or an extension as a keyword', () => {
    const schema = wild({
      properties: { minimum: { type: 'string' }, type: { type: 'string' } },
      default: { minimum: 'x' },
      'x-ext': { minimum: 'x' },
    })
    expect(sanitizeSchema(schema)).toStrictEqual(schema)
  })
})
