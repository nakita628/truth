import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { _enum } from './enum.js'

describe('typebox enum', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ enum: ['A', 'B'] }, 'Type.Union([Type.Literal("A"),Type.Literal("B")])'],
    [{ enum: ['active'] }, 'Type.Literal("active")'],
    [{ enum: [1, 2], type: 'number' }, 'Type.Union([Type.Literal(1),Type.Literal(2)])'],
    [{ enum: [true, false] }, 'Type.Union([Type.Literal(true),Type.Literal(false)])'],
    [{ enum: [null] }, 'Type.Null()'],
    [{ enum: [null, 'a'] }, 'Type.Union([Type.Null(),Type.Literal("a")])'],
    [{ enum: [[], {}, [1, 2, 3]] }, 'Type.Any()'],
    [{ enum: ['a', { key: 'value' }] }, 'Type.Any()'],
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
        'Type.Union([Type.Literal("red"),Type.Literal("green"),Type.Literal("blue")],{errorMessage:"Invalid color"})',
      ],
      [
        {
          enum: ['active'],
          'x-error-message': 'Must be active',
        },
        'Type.Literal("active",{errorMessage:"Must be active"})',
      ],
      [
        {
          type: 'number',
          enum: [1, 2, 3],
          'x-error-message': 'Invalid number',
        },
        'Type.Union([Type.Literal(1),Type.Literal(2),Type.Literal(3)],{errorMessage:"Invalid number"})',
      ],
    ])('_enum(%o) → %s', (input, expected) => {
      expect(_enum(input)).toBe(expected)
    })
  })
})
