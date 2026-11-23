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
    // draft-04: a boolean flag makes `minimum` / `maximum` exclusive
    [{ type: 'integer', minimum: 0, exclusiveMinimum: true }, 'Type.Integer({exclusiveMinimum:0})'],
    [
      { type: 'integer', maximum: 100, exclusiveMaximum: true },
      'Type.Integer({exclusiveMaximum:100})',
    ],
    [
      { type: 'integer', minimum: 0, exclusiveMinimum: false, maximum: 9, exclusiveMaximum: false },
      'Type.Integer({minimum:0,maximum:9})',
    ],
    [{ type: 'integer', exclusiveMaximum: true }, 'Type.Integer()'],
    [
      { type: 'integer', minimum: 0, exclusiveMinimum: true, 'x-minimum-message': 'unused' },
      'Type.Integer({exclusiveMinimum:0})',
    ],
    [
      {
        type: 'integer',
        format: 'bigint',
        minimum: 0,
        exclusiveMinimum: true,
        maximum: 100,
        exclusiveMaximum: true,
      },
      'Type.BigInt({exclusiveMinimum:0n,exclusiveMaximum:100n})',
    ],
    [{ type: 'integer', format: 'bigint' }, 'Type.BigInt()'],
    [
      { type: 'integer', format: 'bigint', exclusiveMinimum: 0, exclusiveMaximum: 100 },
      'Type.BigInt({exclusiveMinimum:0n,exclusiveMaximum:100n})',
    ],
    [
      {
        type: 'integer',
        format: 'bigint',
        exclusiveMinimum: 0,
        'x-exclusiveMinimum-message': 'm',
      },
      'Type.BigInt({exclusiveMinimum:0n,errorMessage:{exclusiveMinimum:"m"}})',
    ],
    [{ type: 'integer', format: 'bigint', multipleOf: 5 }, 'Type.BigInt({multipleOf:5n})'],
    // `value % BigInt(multipleOf)` throws on a fraction or zero, so neither is emitted.
    [{ type: 'integer', format: 'bigint', multipleOf: 0.5 }, 'Type.BigInt()'],
    [{ type: 'integer', format: 'bigint', multipleOf: 0 }, 'Type.BigInt()'],
    // A fractional bound rounds to the integer that admits the same bigints.
    [
      { type: 'integer', format: 'bigint', minimum: 0.5, maximum: 9.5 },
      'Type.BigInt({minimum:1n,maximum:9n})',
    ],
    [
      { type: 'integer', format: 'bigint', minimum: -0.5, maximum: -0.5 },
      'Type.BigInt({minimum:0n,maximum:-1n})',
    ],
    [
      { type: 'integer', format: 'bigint', exclusiveMinimum: 0.5, exclusiveMaximum: 9.5 },
      'Type.BigInt({exclusiveMinimum:0n,exclusiveMaximum:10n})',
    ],
    [
      {
        type: 'integer',
        format: 'bigint',
        minimum: 0.5,
        exclusiveMinimum: true,
        maximum: 9.5,
        exclusiveMaximum: true,
      },
      'Type.BigInt({exclusiveMinimum:0n,exclusiveMaximum:10n})',
    ],
    // The digits are spelled out: a template literal would write 1e+21.
    [
      { type: 'integer', format: 'bigint', minimum: -1e21, maximum: 1e21 },
      'Type.BigInt({minimum:-1000000000000000000000n,maximum:1000000000000000000000n})',
    ],
    [
      { type: 'integer', format: 'bigint', minimum: 0, maximum: 100 },
      'Type.BigInt({minimum:0n,maximum:100n})',
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
        'Type.BigInt({minimum:0n,errorMessage:"Invalid bigint"})',
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })
})
