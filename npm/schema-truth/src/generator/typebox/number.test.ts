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
    // draft-04: a boolean flag makes `minimum` / `maximum` exclusive
    [{ type: 'number', minimum: 0, exclusiveMinimum: true }, 'Type.Number({exclusiveMinimum:0})'],
    [
      { type: 'number', maximum: 100, exclusiveMaximum: true },
      'Type.Number({exclusiveMaximum:100})',
    ],
    [
      { type: 'number', minimum: 0, exclusiveMinimum: false, maximum: 1, exclusiveMaximum: false },
      'Type.Number({minimum:0,maximum:1})',
    ],
    [{ type: 'number', exclusiveMinimum: true }, 'Type.Number()'],
    [
      { type: 'number', minimum: 0, exclusiveMinimum: true, 'x-minimum-message': 'unused' },
      'Type.Number({exclusiveMinimum:0})',
    ],
    [
      {
        type: 'number',
        maximum: 1,
        exclusiveMaximum: true,
        'x-maximum-message': 'at most 1',
        'x-exclusiveMaximum-message': 'below 1',
      },
      'Type.Number({exclusiveMaximum:1,errorMessage:{exclusiveMaximum:"below 1"}})',
    ],
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

describe('typebox number: the range of a fixed-width format (#121)', () => {
  it.each<[JSONSchema, string]>([
    [
      { type: 'number', format: 'float' },
      'Type.Number({minimum:-3.4028234663852886e38,maximum:3.4028234663852886e38})',
    ],
    [
      { type: 'number', format: 'float32', minimum: 0, maximum: 1e40 },
      'Type.Number({minimum:0,maximum:3.4028234663852886e38})',
    ],
    [{ type: 'number', format: 'double' }, 'Type.Number()'],
  ])('%o → %s', (schema, expected) => {
    expect(number(schema)).toBe(expected)
  })
})
