import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { _enum } from './enum.js'

describe('valibot enum', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ enum: ['A', 'B'] }, 'v.picklist(["A","B"])'],
    [{ enum: ['active'] }, "v.literal('active')"],
    [{ enum: [1, 2], type: 'number' }, 'v.union([v.literal(1),v.literal(2)])'],
    [{ enum: [true, false], type: 'boolean' }, 'v.union([v.literal(true),v.literal(false)])'],
    [{ enum: [null] }, 'v.null()'],
  ])('_enum(%o) → %s', (input, expected) => {
    expect(_enum(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          enum: ['red', 'green', 'blue'],
          'x-error-message': 'Invalid color',
        },
        'v.picklist(["red","green","blue"],"Invalid color")',
      ],
      [
        {
          enum: ['active'],
          'x-error-message': 'Must be active',
        },
        'v.literal(\'active\',"Must be active")',
      ],
      [
        {
          type: 'number',
          enum: [1, 2, 3],
          'x-error-message': 'Invalid number',
        },
        'v.union([v.literal(1),v.literal(2),v.literal(3)],"Invalid number")',
      ],
    ])('_enum(%o) → %s', (input, expected) => {
      expect(_enum(input)).toBe(expected)
    })
  })

  // x-enum-error-messages was removed: the extension generated dead code
  // (per-literal branches that can never match a rejected input).
  // Whole-enum messages now come from x-error-message; per-value
  // business rules belong in handler code.
})
