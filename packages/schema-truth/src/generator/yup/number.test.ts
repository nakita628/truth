import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { number } from './number.js'

describe('number', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'number' }, 'yup.number()'],
    [{ type: 'number', minimum: 0 }, 'yup.number().min(0)'],
    [{ type: 'number', minimum: 100 }, 'yup.number().min(100)'],
    [{ type: 'number', maximum: 10 }, 'yup.number()'],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })
})
