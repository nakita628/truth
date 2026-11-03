import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { _enum } from './enum.js'

describe('arktype enum', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ enum: ['A', 'B'] }, `"'A' | 'B'"`],
    [{ enum: ['active'] }, `"'active'"`],
    [{ enum: [1, 2] }, '"1 | 2"'],
    [{ enum: [true, false] }, '"true | false"'],
    [{ enum: [null] }, '"null"'],
    [{ enum: ["it's", 'plain'] }, `type.enumerated("it's","plain")`],
    [{ enum: ['say "hi"', 1] }, 'type.enumerated("say \\"hi\\"",1)'],
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
        `type("'red' | 'green' | 'blue'").describe("Invalid color")`,
      ],
      [
        {
          enum: ['active'],
          'x-error-message': 'Must be active',
        },
        `type("'active'").describe("Must be active")`,
      ],
      [
        {
          enum: [1, 2],
          'x-error-message': 'Pick a number',
        },
        'type("1 | 2").describe("Pick a number")',
      ],
    ])('_enum(%o) → %s', (input, expected) => {
      expect(_enum(input)).toBe(expected)
    })
  })
})
