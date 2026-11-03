import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { _enum } from './enum.js'

describe('_enum', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ enum: ['A', 'B'] }, 'z.enum(["A","B"])'],
    [{ enum: [1, 2], type: 'number' }, 'z.union([z.literal(1),z.literal(2)])'],
    [{ enum: [true, false], type: 'boolean' }, 'z.union([z.literal(true),z.literal(false)])'],
    [{ enum: [null] }, 'z.literal(null)'],
    [{ enum: ['abc'] }, "z.literal('abc')"],
    [{ type: 'array', enum: [[1, 2]] }, 'z.tuple([z.literal(1),z.literal(2)])'],
    [
      {
        type: 'array',
        enum: [
          [1, 2],
          [3, 4],
        ],
      },
      'z.union([z.tuple([z.literal(1),z.literal(2)]),z.tuple([z.literal(3),z.literal(4)])])',
    ],
    [{ enum: [1, 'a', true] }, "z.union([z.literal(1),z.literal('a'),z.literal(true)])"],
    // Non-primitive enum members use structural matchers (Zod v4 z.literal is primitive-only)
    [{ type: 'object', enum: [{ a: 1 }] }, 'z.strictObject({a:z.literal(1)})'],
    [{ enum: [{}, []] }, 'z.union([z.strictObject({}),z.tuple([])])'],
    [{ enum: [{ 'x-foo': 1 }] }, 'z.strictObject({"x-foo":z.literal(1)})'],
    [{ enum: [{ a: [1] }] }, 'z.strictObject({a:z.tuple([z.literal(1)])})'],
  ])('_enum(%o) → %s', (input, expected) => {
    expect(_enum(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { enum: ['active', 'inactive'], 'x-error-message': 'Invalid status' },
        'z.enum(["active","inactive"],{error:"Invalid status"})',
      ],
      [
        {
          type: 'number',
          enum: [1, 2, 3],
          'x-error-message': 'Must be 1, 2, or 3',
        },
        'z.union([z.literal(1),z.literal(2),z.literal(3)],{error:"Must be 1, 2, or 3"})',
      ],
    ])('_enum(%o) → %s', (input, expected) => {
      expect(_enum(input)).toBe(expected)
    })
  })

  // x-enum-error-messages was removed: the extension generated dead code
  // (per-literal `value === 'admin'` branches that can never match a
  // rejected input). Whole-enum messages now come from x-error-message;
  // per-value business rules belong in handler code.
})
