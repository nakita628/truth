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
      'Type.BigInt({exclusiveMinimum:0,exclusiveMaximum:100})',
    ],
    [{ type: 'integer', format: 'bigint' }, 'Type.BigInt()'],
    [
      { type: 'integer', format: 'bigint', exclusiveMinimum: 0, exclusiveMaximum: 100 },
      'Type.BigInt({exclusiveMinimum:0,exclusiveMaximum:100})',
    ],
    [
      {
        type: 'integer',
        format: 'bigint',
        exclusiveMinimum: 0,
        'x-exclusiveMinimum-message': 'm',
      },
      'Type.BigInt({exclusiveMinimum:0,errorMessage:{exclusiveMinimum:"m"}})',
    ],
    [{ type: 'integer', format: 'bigint', multipleOf: 5 }, 'Type.BigInt({multipleOf:5})'],
    // A fractional divisor p/q reduces to p: a bigint is a multiple of 5/2 exactly when it
    // is a multiple of 5.
    [{ type: 'integer', format: 'bigint', multipleOf: 2.5 }, 'Type.BigInt({multipleOf:5})'],
    [{ type: 'integer', format: 'bigint', multipleOf: 0.5 }, 'Type.BigInt({multipleOf:1})'],
    [{ type: 'integer', format: 'bigint', multipleOf: 0.75 }, 'Type.BigInt({multipleOf:3})'],
    [{ type: 'integer', format: 'bigint', multipleOf: 1.5e-7 }, 'Type.BigInt({multipleOf:3})'],
    // 0.9999999999999999 reduces to 9999999999999999, which a number literal reads as
    // 10000000000000000, so the divisor is left out.
    [{ type: 'integer', format: 'bigint', multipleOf: 0.9999999999999999 }, 'Type.BigInt()'],
    [
      { type: 'integer', format: 'bigint', multipleOf: 1e21 },
      'Type.BigInt({multipleOf:1000000000000000000000})',
    ],
    // `value % BigInt(0)` throws, so a zero divisor is left out with its message.
    [
      { type: 'integer', format: 'bigint', multipleOf: 0, 'x-multipleOf-message': 'm' },
      'Type.BigInt()',
    ],
    // A negative divisor has the same multiples as its absolute value.
    [{ type: 'integer', format: 'bigint', multipleOf: -5 }, 'Type.BigInt({multipleOf:5})'],
    // A fractional bound rounds to the integer that admits the same bigints, since
    // `Value.Create` runs `BigInt()` on it.
    [
      { type: 'integer', format: 'bigint', minimum: 0.5, maximum: 9.5 },
      'Type.BigInt({minimum:1,maximum:9})',
    ],
    [
      { type: 'integer', format: 'bigint', minimum: -0.5, maximum: -0.5 },
      'Type.BigInt({minimum:0,maximum:-1})',
    ],
    [
      { type: 'integer', format: 'bigint', exclusiveMinimum: 0.5, exclusiveMaximum: 9.5 },
      'Type.BigInt({exclusiveMinimum:0,exclusiveMaximum:10})',
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
      'Type.BigInt({exclusiveMinimum:0,exclusiveMaximum:10})',
    ],
    [
      { type: 'integer', format: 'bigint', minimum: -1e21, maximum: 1e21 },
      'Type.BigInt({minimum:-1e+21,maximum:1e+21})',
    ],
    [
      { type: 'integer', format: 'bigint', minimum: 0, maximum: 100 },
      'Type.BigInt({minimum:0,maximum:100})',
    ],
    // A non-finite bound (a YAML `.inf`) has no bigint and is left out.
    [
      {
        type: 'integer',
        format: 'bigint',
        minimum: Number.NEGATIVE_INFINITY,
        maximum: Number.POSITIVE_INFINITY,
        exclusiveMinimum: Number.NEGATIVE_INFINITY,
        exclusiveMaximum: Number.NaN,
        multipleOf: Number.POSITIVE_INFINITY,
      },
      'Type.BigInt()',
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
        'Type.BigInt({minimum:0,errorMessage:"Invalid bigint"})',
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })
})

describe('typebox integer: bigint bounds and divisors a bigint can take', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      { type: 'integer', format: 'bigint', minimum: 0.5, maximum: 2.5 },
      'Type.BigInt({minimum:1,maximum:2})',
    ],
    [
      { type: 'integer', format: 'bigint', exclusiveMinimum: 0.5, exclusiveMaximum: 2.5 },
      'Type.BigInt({exclusiveMinimum:0,exclusiveMaximum:3})',
    ],
    [{ type: 'integer', format: 'bigint', multipleOf: 0.5 }, 'Type.BigInt({multipleOf:1})'],
    [
      { type: 'integer', format: 'bigint', multipleOf: 0, 'x-multipleOf-message': 'm' },
      'Type.BigInt()',
    ],
  ])('integer(%o) -> %s', (schema, expected) => {
    expect(integer(schema)).toBe(expected)
  })
})

describe('typebox integer: the range of a fixed-width format (#121)', () => {
  it.each<[JSONSchema, string]>([
    [
      { type: 'integer', format: 'int32' },
      'Type.Integer({minimum:-2147483648,maximum:2147483647})',
    ],
    [{ type: 'integer', format: 'uint32' }, 'Type.Integer({minimum:0,maximum:4294967295})'],
    [
      { type: 'integer', format: 'int32', minimum: 1, maximum: 9_999_999_999 },
      'Type.Integer({minimum:1,maximum:2147483647})',
    ],
    [
      { type: 'integer', format: 'int32', exclusiveMinimum: -1e12 },
      'Type.Integer({minimum:-2147483648,maximum:2147483647})',
    ],
    [
      {
        type: 'integer',
        format: 'int32',
        minimum: -1e12,
        'x-minimum-message': 'at least -1e12',
        'x-error-message': 'an int32',
      },
      'Type.Integer({minimum:-2147483648,maximum:2147483647,errorMessage:"an int32"})',
    ],
    [
      { type: 'integer', format: 'int32', minimum: 0, 'x-minimum-message': 'at least 0' },
      'Type.Integer({minimum:0,maximum:2147483647,errorMessage:{minimum:"at least 0"}})',
    ],
    [
      { type: 'integer', format: 'uint32', exclusiveMinimum: 5, maximum: 10 },
      'Type.Integer({exclusiveMinimum:5,maximum:10})',
    ],
    [
      { type: 'integer', format: 'int32', minimum: -1e12, exclusiveMinimum: true },
      'Type.Integer({minimum:-2147483648,maximum:2147483647})',
    ],
  ])('%o → %s', (schema, expected) => {
    expect(integer(schema)).toBe(expected)
  })
})

describe('typebox integer: a fixed-width range beside multipleOf (#121)', () => {
  it('puts each format bound on the nearest multiple inside the range', () => {
    expect(integer({ type: 'integer', format: 'int32', multipleOf: 10 })).toBe(
      'Type.Integer({minimum:-2147483640,maximum:2147483640,multipleOf:10})',
    )
  })
})
