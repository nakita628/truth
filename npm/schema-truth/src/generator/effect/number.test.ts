import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { number } from './number.js'

describe('effect number', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'number' }, 'Schema.Number'],
    [{ type: 'number', minimum: 0 }, 'Schema.Number.check(Schema.isGreaterThanOrEqualTo(0))'],
    [{ type: 'number', maximum: 100 }, 'Schema.Number.check(Schema.isLessThanOrEqualTo(100))'],
    [
      { type: 'number', minimum: 0, maximum: 100 },
      'Schema.Number.check(Schema.isGreaterThanOrEqualTo(0),Schema.isLessThanOrEqualTo(100))',
    ],
    [{ type: 'number', multipleOf: 0.5 }, 'Schema.Number.check(Schema.isMultipleOf(0.5))'],
    [{ type: 'number', exclusiveMinimum: 0 }, 'Schema.Number.check(Schema.isGreaterThan(0))'],
    [{ type: 'number', exclusiveMaximum: 100 }, 'Schema.Number.check(Schema.isLessThan(100))'],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'number', 'x-error-message': 'Must be a number' },
        'Schema.Number.annotate({message:"Must be a number"})',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          'x-minimum-message': 'Must be non-negative',
        },
        'Schema.Number.check(Schema.isGreaterThanOrEqualTo(0,{message:"Must be non-negative"}))',
      ],
      [
        {
          type: 'number',
          maximum: 100,
          'x-maximum-message': 'Must be at most 100',
        },
        'Schema.Number.check(Schema.isLessThanOrEqualTo(100,{message:"Must be at most 100"}))',
      ],
      [
        {
          type: 'number',
          multipleOf: 0.5,
          'x-multipleOf-message': 'Must be a multiple of 0.5',
        },
        'Schema.Number.check(Schema.isMultipleOf(0.5,{message:"Must be a multiple of 0.5"}))',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          maximum: 100,
          'x-error-message': 'Invalid number',
          'x-minimum-message': 'Too small',
          'x-maximum-message': 'Too large',
        },
        'Schema.Number.check(Schema.isGreaterThanOrEqualTo(0,{message:"Too small"}),Schema.isLessThanOrEqualTo(100,{message:"Too large"})).annotate({message:"Invalid number"})',
      ],
    ])('number(%o) → %s', (input, expected) => {
      expect(number(input)).toBe(expected)
    })
  })
})
