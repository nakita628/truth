import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import { bigintBounds, bigintDivisor } from './bigint.js'

describe('bigintBounds', () => {
  it.concurrent.each<[JSONSchema, JSONSchema]>([
    [
      { type: 'integer', minimum: 0.5, maximum: 2.5 },
      { type: 'integer', minimum: 1, maximum: 2 },
    ],
    [
      { exclusiveMinimum: 0.5, exclusiveMaximum: 2.5 },
      { exclusiveMinimum: 0, exclusiveMaximum: 3 },
    ],
    [
      { minimum: 0.5, exclusiveMinimum: true, maximum: 2.5, exclusiveMaximum: true },
      { minimum: 0, exclusiveMinimum: true, maximum: 3, exclusiveMaximum: true },
    ],
    [{ minimum: Infinity, exclusiveMinimum: true }, {}],
    [
      { multipleOf: 2.5, 'x-multipleOf-message': 'm' },
      { multipleOf: 5, 'x-multipleOf-message': 'm' },
    ],
    [{ multipleOf: 0, 'x-multipleOf-message': 'm' }, {}],
    [{ multipleOf: -2 }, {}],
  ])('bigintBounds(%o) -> %o', (schema, expected) => {
    expect(bigintBounds(schema)).toStrictEqual(expected)
  })
})

describe('bigintDivisor', () => {
  it.concurrent.each<[unknown, number | undefined]>([
    [2, 2],
    [0.5, 1],
    [2.5, 5],
    [1e-7, 1],
    [1e21, 1e21],
    [0, undefined],
    [-1, undefined],
    [Infinity, undefined],
    ['2', undefined],
  ])('bigintDivisor(%o) -> %o', (value, expected) => {
    expect(bigintDivisor(value)).toBe(expected)
  })
})
