import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { integer } from './integer.js'

describe('arktype integer', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'integer' }, '"number.integer"'],
    [{ type: 'integer', minimum: 0 }, '"number.integer >= 0"'],
    [{ type: 'integer', maximum: 100 }, '"number.integer <= 100"'],
    [
      { type: 'integer', minimum: 0, maximum: 100 },
      '"number.integer >= 0 & number.integer <= 100"',
    ],
    [{ type: 'integer', exclusiveMinimum: 50 }, '"number.integer > 50"'],
    [{ type: 'integer', exclusiveMaximum: 50 }, '"number.integer < 50"'],
    [{ type: 'integer', multipleOf: 2 }, '"number.integer % 2"'],
    [{ type: 'integer', format: 'bigint' }, '"bigint"'],
  ])('integer(%o) → %s', (input, expected) => {
    expect(integer(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'integer', 'x-error-message': 'Must be integer' },
        'type("number.integer").describe("Must be integer")',
      ],
      [
        {
          type: 'integer',
          minimum: 0,
          maximum: 100,
          'x-error-message': 'Must be 0-100',
        },
        'type("number.integer >= 0 & number.integer <= 100").describe("Must be 0-100")',
      ],
      [
        {
          type: 'integer',
          format: 'bigint',
          'x-error-message': 'Must be bigint',
        },
        'type("bigint").describe("Must be bigint")',
      ],
      [
        {
          type: 'integer',
          multipleOf: 10,
          'x-error-message': 'Multiple of 10',
        },
        'type("number.integer % 10").describe("Multiple of 10")',
      ],
      [
        {
          type: 'integer',
          exclusiveMinimum: 0,
          'x-error-message': 'Must be positive',
        },
        'type("number.integer > 0").describe("Must be positive")',
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })
})

describe('arktype integer per-keyword message', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      { type: 'integer', minimum: 0, 'x-minimum-message': 'min!' },
      'type("number.integer").narrow((data, ctx) => data >= 0 || ctx.mustBe("min!"))',
    ],
    [
      { type: 'integer', maximum: 100, 'x-maximum-message': 'max!' },
      'type("number.integer").narrow((data, ctx) => data <= 100 || ctx.mustBe("max!"))',
    ],
    [
      { type: 'integer', exclusiveMinimum: 5, 'x-exclusiveMinimum-message': 'gt!' },
      'type("number.integer").narrow((data, ctx) => data > 5 || ctx.mustBe("gt!"))',
    ],
    [
      { type: 'integer', exclusiveMaximum: 5, 'x-exclusiveMaximum-message': 'lt!' },
      'type("number.integer").narrow((data, ctx) => data < 5 || ctx.mustBe("lt!"))',
    ],
    [
      {
        type: 'integer',
        minimum: 0,
        exclusiveMinimum: true,
        'x-exclusiveMinimum-message': 'gt0!',
      },
      'type("number.integer").narrow((data, ctx) => data > 0 || ctx.mustBe("gt0!"))',
    ],
    [
      {
        type: 'integer',
        maximum: 9,
        exclusiveMaximum: true,
        'x-exclusiveMaximum-message': 'lt9!',
      },
      'type("number.integer").narrow((data, ctx) => data < 9 || ctx.mustBe("lt9!"))',
    ],
    [
      { type: 'integer', multipleOf: 2, 'x-multipleOf-message': 'even!' },
      'type("number.integer").narrow((data, ctx) => data % 2 === 0 || ctx.mustBe("even!"))',
    ],
    [
      { type: 'integer', minimum: 0, maximum: 9, 'x-minimum-message': 'only-min' },
      'type("number.integer").narrow((data, ctx) => data >= 0 || ctx.mustBe("only-min")).narrow((data, ctx) => data <= 9 || ctx.mustBe("must be <= 9"))',
    ],
    [
      { type: 'integer', minimum: 0, 'x-minimum-message': 'min!', 'x-error-message': 'E' },
      'type("number.integer").narrow((data, ctx) => data >= 0 || ctx.mustBe("min!")).describe("E")',
    ],
    [
      { type: 'integer', format: 'bigint', minimum: 0, 'x-minimum-message': 'min!' },
      'type("bigint").narrow((data, ctx) => data >= BigInt(0) || ctx.mustBe("at least 0"))',
    ],
  ])('integer(%o) → %s', (input, expected) => {
    expect(integer(input)).toBe(expected)
  })
})
