import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { integer } from './integer.js'

describe('effect integer', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'integer' }, 'Schema.Number.check(Schema.isInt())'],
    [
      { type: 'integer', minimum: 0 },
      'Schema.Number.check(Schema.isInt(),Schema.isGreaterThanOrEqualTo(0))',
    ],
    [
      { type: 'integer', maximum: 100 },
      'Schema.Number.check(Schema.isInt(),Schema.isLessThanOrEqualTo(100))',
    ],
    [
      { type: 'integer', minimum: 0, maximum: 100 },
      'Schema.Number.check(Schema.isInt(),Schema.isGreaterThanOrEqualTo(0),Schema.isLessThanOrEqualTo(100))',
    ],
    [
      { type: 'integer', multipleOf: 2 },
      'Schema.Number.check(Schema.isInt(),Schema.isMultipleOf(2))',
    ],
    [{ type: 'integer', format: 'bigint' }, 'Schema.BigInt'],
    [
      { type: 'integer', format: 'bigint', minimum: 0 },
      'Schema.BigInt.check(Schema.isGreaterThanOrEqualToBigInt(BigInt(0)))',
    ],
    [
      { type: 'integer', exclusiveMinimum: 0 },
      'Schema.Number.check(Schema.isInt(),Schema.isGreaterThan(0))',
    ],
    [
      { type: 'integer', exclusiveMaximum: 100 },
      'Schema.Number.check(Schema.isInt(),Schema.isLessThan(100))',
    ],
  ])('integer(%o) → %s', (input, expected) => {
    expect(integer(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'integer', 'x-error-message': 'Must be integer' },
        'Schema.Number.check(Schema.isInt({message:"Must be integer"}))',
      ],
      [
        {
          type: 'integer',
          minimum: 0,
          'x-minimum-message': 'Must be non-negative',
        },
        'Schema.Number.check(Schema.isInt(),Schema.isGreaterThanOrEqualTo(0,{message:"Must be non-negative"}))',
      ],
      [
        {
          type: 'integer',
          maximum: 100,
          'x-maximum-message': 'Must be at most 100',
        },
        'Schema.Number.check(Schema.isInt(),Schema.isLessThanOrEqualTo(100,{message:"Must be at most 100"}))',
      ],
      [
        {
          type: 'integer',
          multipleOf: 5,
          'x-multipleOf-message': 'Must be a multiple of 5',
        },
        'Schema.Number.check(Schema.isInt(),Schema.isMultipleOf(5,{message:"Must be a multiple of 5"}))',
      ],
      [
        {
          type: 'integer',
          format: 'bigint',
          minimum: 0,
          'x-error-message': 'Must be bigint',
          'x-minimum-message': 'Must be non-negative',
        },
        'Schema.BigInt.check(Schema.isGreaterThanOrEqualToBigInt(BigInt(0),{message:"Must be non-negative"})).annotate({message:"Must be bigint"})',
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })
})
