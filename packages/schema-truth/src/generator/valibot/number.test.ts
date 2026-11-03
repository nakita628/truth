import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { number } from './number.js'

describe('valibot number', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'number' }, 'v.number()'],
    [{ type: 'number', minimum: 0 }, 'v.pipe(v.number(),v.minValue(0))'],
    [{ type: 'number', maximum: 100 }, 'v.pipe(v.number(),v.maxValue(100))'],
    [
      { type: 'number', minimum: 0, maximum: 100 },
      'v.pipe(v.number(),v.minValue(0),v.maxValue(100))',
    ],
    [{ type: 'number', multipleOf: 0.5 }, 'v.pipe(v.number(),v.multipleOf(0.5))'],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'number', 'x-error-message': 'Must be a number' }, 'v.number("Must be a number")'],
      [
        {
          type: 'number',
          minimum: 0,
          'x-minimum-message': 'Must be non-negative',
        },
        'v.pipe(v.number(),v.minValue(0,"Must be non-negative"))',
      ],
      [
        {
          type: 'number',
          maximum: 100,
          'x-maximum-message': 'Must be at most 100',
        },
        'v.pipe(v.number(),v.maxValue(100,"Must be at most 100"))',
      ],
      [
        {
          type: 'number',
          multipleOf: 0.5,
          'x-multipleOf-message': 'Must be a multiple of 0.5',
        },
        'v.pipe(v.number(),v.multipleOf(0.5,"Must be a multiple of 0.5"))',
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
        'v.pipe(v.number("Invalid number"),v.minValue(0,"Too small"),v.maxValue(100,"Too large"))',
      ],
    ])('number(%o) → %s', (input, expected) => {
      expect(number(input)).toBe(expected)
    })
  })
})
