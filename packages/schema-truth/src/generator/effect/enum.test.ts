import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { _enum } from './enum.js'

describe('effect enum', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ enum: ['A', 'B'] }, 'Schema.Literals(["A","B"])'],
    [{ enum: ['active'] }, 'Schema.Literal("active")'],
    [{ enum: [1, 2], type: 'number' }, 'Schema.Literals([1,2])'],
    [{ enum: [true, false], type: 'boolean' }, 'Schema.Literals([true,false])'],
    [{ enum: [null] }, 'Schema.Literal(null)'],
    [
      { enum: [[1, 2, 3]], type: 'array' },
      'Schema.Tuple([Schema.Literal(1),Schema.Literal(2),Schema.Literal(3)])',
    ],
    [{ enum: [1, 'a', true] }, 'Schema.Literals([1,"a",true])'],
    [{ enum: ['a', null, 42] }, 'Schema.Literals(["a",null,42])'],
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
        'Schema.Literals(["red","green","blue"]).annotate({message:"Invalid color"})',
      ],
      [
        {
          enum: ['active'],
          'x-error-message': 'Must be active',
        },
        'Schema.Literal("active").annotate({message:"Must be active"})',
      ],
      [
        {
          type: 'number',
          enum: [1, 2, 3],
          'x-error-message': 'Invalid number',
        },
        'Schema.Literals([1,2,3]).annotate({message:"Invalid number"})',
      ],
    ])('_enum(%o) → %s', (input, expected) => {
      expect(_enum(input)).toBe(expected)
    })
  })

  describe('additional branches', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ enum: [42], type: 'number' }, 'Schema.Literal(42)'],
      [{ enum: [true], type: 'boolean' }, 'Schema.Literal(true)'],
      [
        {
          enum: [
            [1, 2],
            [3, 4],
          ],
          type: 'array',
        },
        'Schema.Union([Schema.Tuple([Schema.Literal(1),Schema.Literal(2)]),Schema.Tuple([Schema.Literal(3),Schema.Literal(4)])])',
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
