import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import { additionalBesideCombinator } from './additional-beside.js'

describe('additionalBesideCombinator (#138)', () => {
  it('holds the keys the node leaves to additionalProperties beside an allOf', () => {
    const schema: JSONSchema = {
      allOf: [{ type: 'object' }],
      properties: { a: { type: 'string' } },
      patternProperties: { '^x': { type: 'number' } },
      additionalProperties: false,
    }
    expect(additionalBesideCombinator(schema)).toStrictEqual({
      allOf: [
        {
          allOf: [{ type: 'object' }],
          properties: { a: { type: 'string' } },
          patternProperties: { '^x': { type: 'number' } },
        },
        {
          allOf: [{ type: 'object' }],
          properties: { a: {} },
          patternProperties: { '^x': {} },
          unevaluatedProperties: false,
        },
      ],
    })
  })

  it.each<[string, JSONSchema]>([
    ['no combinator', { type: 'object', additionalProperties: false }],
    ['additionalProperties: true', { anyOf: [{ type: 'object' }], additionalProperties: true }],
    ['no additionalProperties', { oneOf: [{ type: 'object' }] }],
  ])('leaves a node with %s alone', (_, schema) => {
    expect(additionalBesideCombinator(schema)).toBeUndefined()
  })
})
