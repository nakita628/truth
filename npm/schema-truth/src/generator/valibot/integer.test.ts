import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { integer } from './integer.js'

describe('valibot integer', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'integer' }, 'v.pipe(v.number(),v.integer())'],
    [{ type: 'integer', minimum: 0 }, 'v.pipe(v.number(),v.integer(),v.minValue(0))'],
    [{ type: 'integer', maximum: 100 }, 'v.pipe(v.number(),v.integer(),v.maxValue(100))'],
    [
      { type: 'integer', minimum: 0, maximum: 100 },
      'v.pipe(v.number(),v.integer(),v.minValue(0),v.maxValue(100))',
    ],
    [{ type: 'integer', multipleOf: 2 }, 'v.pipe(v.number(),v.integer(),v.multipleOf(2))'],
    [{ type: 'integer', format: 'bigint' }, 'v.bigint()'],
    [{ type: 'integer', format: 'bigint', minimum: 0 }, 'v.pipe(v.bigint(),v.minValue(BigInt(0)))'],
  ])('integer(%o) → %s', (input, expected) => {
    expect(integer(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'integer', 'x-error-message': 'Must be integer' },
        'v.pipe(v.number("Must be integer"),v.integer("Must be integer"))',
      ],
      [
        {
          type: 'integer',
          minimum: 0,
          'x-minimum-message': 'Must be non-negative',
        },
        'v.pipe(v.number(),v.integer(),v.minValue(0,"Must be non-negative"))',
      ],
      [
        {
          type: 'integer',
          maximum: 100,
          'x-maximum-message': 'Must be at most 100',
        },
        'v.pipe(v.number(),v.integer(),v.maxValue(100,"Must be at most 100"))',
      ],
      [
        {
          type: 'integer',
          multipleOf: 5,
          'x-multipleOf-message': 'Must be a multiple of 5',
        },
        'v.pipe(v.number(),v.integer(),v.multipleOf(5,"Must be a multiple of 5"))',
      ],
      [
        {
          type: 'integer',
          format: 'bigint',
          minimum: 0,
          'x-error-message': 'Must be bigint',
          'x-minimum-message': 'Must be non-negative',
        },
        'v.pipe(v.bigint("Must be bigint"),v.minValue(BigInt(0),"Must be non-negative"))',
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })
})

describe('valibot integer: bigint bounds and divisors a bigint can take', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      { type: 'integer', format: 'bigint', minimum: 0.5, maximum: 2.5 },
      'v.pipe(v.bigint(),v.minValue(BigInt(1)),v.maxValue(BigInt(2)))',
    ],
    [
      { type: 'integer', format: 'bigint', exclusiveMinimum: 0.5, exclusiveMaximum: 2.5 },
      'v.pipe(v.bigint(),v.gtValue(BigInt(0)),v.ltValue(BigInt(3)))',
    ],
    [
      { type: 'integer', format: 'bigint', multipleOf: 0.5 },
      'v.pipe(v.bigint(),v.multipleOf(BigInt(1)))',
    ],
    [
      { type: 'integer', format: 'bigint', multipleOf: 0, 'x-multipleOf-message': 'm' },
      'v.bigint()',
    ],
    [
      { type: 'integer', format: 'int64', minimum: 0.5, multipleOf: 2.5 },
      String.raw`v.pipe(v.union([v.bigint(),v.pipe(v.number(),v.integer()),v.pipe(v.string(),v.regex(/^-?\d+$/))]),v.transform((input)=>BigInt(input)),v.minValue(-9223372036854775808n),v.maxValue(9223372036854775807n),v.minValue(1n),v.multipleOf(5n))`,
    ],
    [
      { type: 'integer', format: 'int64', maximum: 1e21 },
      String.raw`v.pipe(v.union([v.bigint(),v.pipe(v.number(),v.integer()),v.pipe(v.string(),v.regex(/^-?\d+$/))]),v.transform((input)=>BigInt(input)),v.minValue(-9223372036854775808n),v.maxValue(9223372036854775807n),v.maxValue(1000000000000000000000n))`,
    ],
  ])('integer(%o) -> %s', (schema, expected) => {
    expect(integer(schema)).toBe(expected)
  })
})
