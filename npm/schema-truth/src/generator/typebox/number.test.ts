import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { number } from './number.js'

describe('typebox number', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'number' }, 'Type.Number()'],
    [{ type: 'number', minimum: 0 }, 'Type.Number({minimum:0})'],
    [{ type: 'number', maximum: 100 }, 'Type.Number({maximum:100})'],
    [{ type: 'number', minimum: 0, maximum: 100 }, 'Type.Number({minimum:0,maximum:100})'],
    [{ type: 'number', exclusiveMinimum: 0 }, 'Type.Number({exclusiveMinimum:0})'],
    [{ type: 'number', exclusiveMaximum: 100 }, 'Type.Number({exclusiveMaximum:100})'],
    [{ type: 'number', multipleOf: 0.5 }, 'Type.Number({multipleOf:0.5})'],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'number', 'x-error-message': 'Must be a number' },
        'Type.Number({errorMessage:"Must be a number"})',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          maximum: 100,
          'x-error-message': 'Must be 0-100',
        },
        'Type.Number({minimum:0,maximum:100,errorMessage:"Must be 0-100"})',
      ],
      [
        {
          type: 'number',
          multipleOf: 5,
          'x-error-message': 'Multiple of 5',
        },
        'Type.Number({multipleOf:5,errorMessage:"Multiple of 5"})',
      ],
      [
        {
          type: 'number',
          exclusiveMinimum: 0,
          'x-error-message': 'Must be positive',
        },
        'Type.Number({exclusiveMinimum:0,errorMessage:"Must be positive"})',
      ],
    ])('number(%o) → %s', (input, expected) => {
      expect(number(input)).toBe(expected)
    })
  })
})
