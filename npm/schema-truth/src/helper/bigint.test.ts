import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import {
  bigintBounds,
  bigintDivisor,
  bigintFormatOf,
  bigintValueLiteral,
  isBigintSchema,
  isWritableBigintDefault,
} from './bigint.js'
import type { BigintSchema } from './bigint.js'

describe('bigintBounds', () => {
  it.concurrent.each<[JSONSchema, BigintSchema]>([
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
    [{ multipleOf: -2 }, { multipleOf: 2 }],
    [{ multipleOf: 2 ** 60 }, { multipleOf: 2 ** 60 }],
  ])('bigintBounds(%o) -> %o', (schema, expected) => {
    expect(bigintBounds(schema)).toStrictEqual(expected)
  })
})

describe('bigintDivisor', () => {
  it.concurrent.each<[unknown, number | bigint | undefined]>([
    [2, 2],
    [0.5, 1],
    [2.5, 5],
    [1e-7, 1],
    [1.5e-7, 3],
    [2 ** 60, 2 ** 60],
    [1e23, 1e23],
    // 12345678901234567 is above 2^53, so it stays a bigint.
    [1.2345678901234567, 12_345_678_901_234_567n],
    // 12345678901234567 is above 2^53, so it stays a bigint.
    [1.2345678901234567, 12_345_678_901_234_567n],
    [-2, 2],
    [-0.5, 1],
    [1e21, 1e21],
    [0, undefined],
    [Infinity, undefined],
    ['2', undefined],
  ])('bigintDivisor(%o) -> %o', (value, expected) => {
    expect(bigintDivisor(value)).toBe(expected)
  })
})

describe('bigintValueLiteral', () => {
  it.concurrent.each<[number, string]>([
    [5, '5n'],
    [-3, '-3n'],
    [1e21, '1000000000000000000000n'],
    [1.5, '1.5'],
  ])('bigintValueLiteral(%o) -> %s', (value, expected) => {
    expect(bigintValueLiteral(value)).toBe(expected)
  })
})

describe('isWritableBigintDefault', () => {
  it.concurrent.each<[unknown, string | undefined, boolean]>([
    [5, 'bigint', true],
    [1.5, 'bigint', false],
    [1.5, undefined, true],
    ['a', 'int64', true],
  ])('isWritableBigintDefault(%o, %o) -> %o', (value, format, expected) => {
    expect(isWritableBigintDefault(value, format)).toBe(expected)
  })
})

describe('bigintFormatOf', () => {
  const definitions = {
    Big: { type: 'integer', format: 'bigint' },
    Long: { type: 'integer', format: 'int64' },
    Loop: { $ref: '#/$defs/Loop' },
  }
  it.concurrent.each<[JSONSchema, string | undefined]>([
    [{ type: 'integer', format: 'uint64' }, 'uint64'],
    [{ type: 'integer' }, undefined],
    [{ $ref: '#/$defs/Big', default: 5 }, 'bigint'],
    [{ $ref: '#/components/schemas/Long', default: 5 }, 'int64'],
    [{ allOf: [{ $ref: '#/$defs/Long' }], default: 5 }, 'int64'],
    [{ anyOf: [{ $ref: '#/$defs/Long' }, { type: 'null' }], default: 5 }, 'int64'],
    [{ oneOf: [{ $ref: '#/$defs/Long' }, { type: 'string' }] }, undefined],
    [{ oneOf: [{ $ref: '#/$defs/Long' }, { $ref: '#/$defs/Big' }] }, 'int64'],
    [{ type: 'number', format: 'bigint' }, undefined],
    [{ format: 'int64', enum: [1, 2] }, 'int64'],
    [{ type: 'integer', format: 'bigint', enum: [1, 2] }, undefined],
    [{ $ref: '#/$defs/Loop' }, undefined],
    [{ $ref: '#/$defs/Missing' }, undefined],
  ])('bigintFormatOf(%o) -> %s', (schema, expected) => {
    expect(bigintFormatOf(schema, definitions, isBigintSchema)).toBe(expected)
  })
})
