import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { integer } from './integer.js'

describe('typebox integer', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'integer' }, 'Type.Integer()'],
    [{ type: 'integer', minimum: 0 }, 'Type.Integer({minimum:0})'],
    [{ type: 'integer', maximum: 100 }, 'Type.Integer({maximum:100})'],
    [{ type: 'integer', minimum: 0, maximum: 100 }, 'Type.Integer({minimum:0,maximum:100})'],
    [{ type: 'integer', exclusiveMinimum: 0 }, 'Type.Integer({exclusiveMinimum:0})'],
    [{ type: 'integer', exclusiveMaximum: 100 }, 'Type.Integer({exclusiveMaximum:100})'],
    [{ type: 'integer', multipleOf: 2 }, 'Type.Integer({multipleOf:2})'],
    [{ type: 'integer', format: 'bigint' }, 'Type.BigInt()'],
    [
      { type: 'integer', format: 'bigint', minimum: 0, maximum: 100 },
      'Type.BigInt({minimum:BigInt(0),maximum:BigInt(100)})',
    ],
  ])('integer(%o) → %s', (input, expected) => {
    expect(integer(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'integer', 'x-error-message': 'Must be integer' },
        'Type.Integer({errorMessage:"Must be integer"})',
      ],
      [
        {
          type: 'integer',
          minimum: 0,
          maximum: 100,
          'x-error-message': 'Must be 0-100',
        },
        'Type.Integer({minimum:0,maximum:100,errorMessage:"Must be 0-100"})',
      ],
      [
        {
          type: 'integer',
          minimum: 1,
          maximum: 999,
          'x-error-message': 'Invalid',
        },
        'Type.Integer({minimum:1,maximum:999,errorMessage:"Invalid"})',
      ],
      [
        {
          type: 'integer',
          multipleOf: 10,
          'x-error-message': 'Must be multiple of 10',
        },
        'Type.Integer({multipleOf:10,errorMessage:"Must be multiple of 10"})',
      ],
      [
        {
          type: 'integer',
          format: 'bigint',
          'x-error-message': 'Must be bigint',
        },
        'Type.BigInt({errorMessage:"Must be bigint"})',
      ],
      [
        {
          type: 'integer',
          format: 'bigint',
          minimum: 0,
          'x-error-message': 'Invalid bigint',
        },
        'Type.BigInt({minimum:BigInt(0),errorMessage:"Invalid bigint"})',
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })
})
