import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { number } from './number.js'

describe('arktype number', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'number' }, '"number"'],
    [{ type: 'number', minimum: 0 }, '"number >= 0"'],
    [{ type: 'number', maximum: 100 }, '"number <= 100"'],
    [{ type: 'number', minimum: 0, maximum: 100 }, '"number >= 0 & number <= 100"'],
    [{ type: 'number', exclusiveMinimum: 0 }, '"number > 0"'],
    [{ type: 'number', exclusiveMaximum: 100 }, '"number < 100"'],
    [{ type: 'number', multipleOf: 0.5 }, '"number % 0.5"'],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'number', 'x-error-message': 'Must be a number' },
        'type("number").describe("Must be a number")',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          maximum: 100,
          'x-error-message': 'Must be 0-100',
        },
        'type("number >= 0 & number <= 100").describe("Must be 0-100")',
      ],
      [
        {
          type: 'number',
          multipleOf: 5,
          'x-error-message': 'Multiple of 5',
        },
        'type("number % 5").describe("Multiple of 5")',
      ],
      [
        {
          type: 'number',
          exclusiveMinimum: 0,
          'x-error-message': 'Must be positive',
        },
        'type("number > 0").describe("Must be positive")',
      ],
    ])('number(%o) → %s', (input, expected) => {
      expect(number(input)).toBe(expected)
    })
  })
})

describe('arktype number per-keyword message', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      { type: 'number', minimum: 0, 'x-minimum-message': 'min!' },
      'type("number").narrow((data, ctx) => data >= 0 || ctx.mustBe("min!"))',
    ],
    [
      { type: 'number', maximum: 100, 'x-maximum-message': 'max!' },
      'type("number").narrow((data, ctx) => data <= 100 || ctx.mustBe("max!"))',
    ],
    [
      { type: 'number', exclusiveMinimum: 5, 'x-exclusiveMinimum-message': 'gt!' },
      'type("number").narrow((data, ctx) => data > 5 || ctx.mustBe("gt!"))',
    ],
    [
      { type: 'number', exclusiveMaximum: 5, 'x-exclusiveMaximum-message': 'lt!' },
      'type("number").narrow((data, ctx) => data < 5 || ctx.mustBe("lt!"))',
    ],
    [
      {
        type: 'number',
        minimum: 0,
        exclusiveMinimum: true,
        'x-exclusiveMinimum-message': 'gt0!',
      },
      'type("number").narrow((data, ctx) => data > 0 || ctx.mustBe("gt0!"))',
    ],
    [
      {
        type: 'number',
        maximum: 9,
        exclusiveMaximum: true,
        'x-exclusiveMaximum-message': 'lt9!',
      },
      'type("number").narrow((data, ctx) => data < 9 || ctx.mustBe("lt9!"))',
    ],
    [
      { type: 'number', multipleOf: 2, 'x-multipleOf-message': 'even!' },
      'type("number").narrow((data, ctx) => data % 2 === 0 || ctx.mustBe("even!"))',
    ],
    [
      { type: 'number', minimum: 0, maximum: 9, 'x-minimum-message': 'only-min' },
      'type("number").narrow((data, ctx) => data >= 0 || ctx.mustBe("only-min")).narrow((data, ctx) => data <= 9 || ctx.mustBe("must be <= 9"))',
    ],
    [
      { type: 'number', minimum: 0, 'x-minimum-message': 'min!', 'x-error-message': 'E' },
      'type("number").narrow((data, ctx) => data >= 0 || ctx.mustBe("min!")).describe("E")',
    ],
    [
      {
        type: 'number',
        minimum: 0,
        maximum: 9,
        'x-maximum-message': 'only-max',
        'x-error-message': 'E',
      },
      'type("number").narrow((data, ctx) => data >= 0 || ctx.mustBe("E")).narrow((data, ctx) => data <= 9 || ctx.mustBe("only-max")).describe("E")',
    ],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })
})
