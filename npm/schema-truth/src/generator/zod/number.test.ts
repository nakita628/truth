import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { number } from './number.js'

describe('number', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'number' }, 'z.number()'],
    [{ type: 'number', minimum: 0, exclusiveMinimum: true }, 'z.number().positive()'],
    [{ type: 'number', minimum: 0, exclusiveMinimum: false }, 'z.number().nonnegative()'],
    [{ type: 'number', maximum: 0, exclusiveMaximum: true }, 'z.number().negative()'],
    [{ type: 'number', maximum: 0, exclusiveMaximum: false }, 'z.number().nonpositive()'],
    [{ type: 'number', minimum: 100 }, 'z.number().min(100)'],
    [{ type: 'number', minimum: 0 }, 'z.number().min(0)'],
    [{ type: 'number', minimum: 100, exclusiveMinimum: true }, 'z.number().gt(100)'],
    [{ type: 'number', maximum: 100 }, 'z.number().max(100)'],
    [{ type: 'number', maximum: 0 }, 'z.number().max(0)'],
    [{ type: 'number', maximum: 100, exclusiveMaximum: true }, 'z.number().lt(100)'],
    [{ type: 'number', exclusiveMinimum: 50 }, 'z.number().gt(50)'],
    [{ type: 'number', exclusiveMaximum: 50 }, 'z.number().lt(50)'],
    [{ type: 'number', multipleOf: 2 }, 'z.number().multipleOf(2)'],
    [{ type: 'number', format: 'float' }, 'z.float32()'],
    [{ type: 'number', format: 'float32' }, 'z.float32()'],
    [{ type: 'number', format: 'float64' }, 'z.float64()'],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'number', 'x-error-message': 'Must be a number' },
        'z.number({error:"Must be a number"})',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          maximum: 100,
          'x-minimum-message': 'Cannot be negative',
          'x-maximum-message': 'Cannot exceed 100',
        },
        'z.number().min(0,{error:"Cannot be negative"}).max(100,{error:"Cannot exceed 100"})',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          exclusiveMinimum: true,
          'x-exclusiveMinimum-message': 'Must be positive',
        },
        'z.number().positive({error:"Must be positive"})',
      ],
      [
        {
          type: 'number',
          multipleOf: 5,
          'x-multipleOf-message': 'Must be a multiple of 5',
        },
        'z.number().multipleOf(5,{error:"Must be a multiple of 5"})',
      ],
      [
        {
          type: 'number',
          format: 'float32',
          'x-error-message': 'Must be a float',
        },
        'z.float32({error:"Must be a float"})',
      ],
    ])('number(%o) → %s', (input, expected) => {
      expect(number(input)).toBe(expected)
    })
  })

  describe('x-coerce', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'number', 'x-coerce': true }, 'z.coerce.number()'],
      [
        { type: 'number', 'x-coerce': true, 'x-error-message': '数値必須' },
        'z.coerce.number({error:"数値必須"})',
      ],
      [{ type: 'number', 'x-coerce': true, minimum: 0 }, 'z.coerce.number().min(0)'],
      // float32 uses pipe (z.coerce.float32() does not exist in Zod v4)
      [
        { type: 'number', format: 'float', 'x-coerce': true },
        'z.coerce.number().pipe(z.float32())',
      ],
      [
        { type: 'number', format: 'float32', 'x-coerce': true },
        'z.coerce.number().pipe(z.float32())',
      ],
      [
        { type: 'number', format: 'float64', 'x-coerce': true },
        'z.coerce.number().pipe(z.float64())',
      ],
      // wirePipe + x-error-message
      [
        { type: 'number', format: 'float', 'x-coerce': true, 'x-error-message': 'float必須' },
        'z.coerce.number({error:"float必須"}).pipe(z.float32({error:"float必須"}))',
      ],
      [
        { type: 'number', format: 'float64', 'x-coerce': true, 'x-error-message': 'float64必須' },
        'z.coerce.number({error:"float64必須"}).pipe(z.float64({error:"float64必須"}))',
      ],
      // wirePipe + x-error-message + constraints
      [
        {
          type: 'number',
          format: 'float',
          'x-coerce': true,
          minimum: 0,
          'x-error-message': 'float必須',
        },
        'z.coerce.number({error:"float必須"}).pipe(z.float32({error:"float必須"}).min(0))',
      ],
      // coerce + x-required-message dropped
      [
        {
          type: 'number',
          'x-coerce': true,
          'x-required-message': '必須です',
          'x-error-message': '数値必須',
        },
        'z.coerce.number({error:"数値必須"})',
      ],
      [{ type: 'number', 'x-coerce': true, 'x-required-message': '必須です' }, 'z.coerce.number()'],
    ])('number(%o) → %s', (input, expected) => {
      expect(number(input)).toBe(expected)
    })
  })
})
