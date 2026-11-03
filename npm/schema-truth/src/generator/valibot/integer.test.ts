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
