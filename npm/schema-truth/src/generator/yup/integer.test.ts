import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { integer } from './integer.js'

describe('integer', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'integer' }, 'yup.number().integer()'],
    [{ type: 'integer', minimum: 0 }, 'yup.number().integer().min(0)'],
    [{ type: 'integer', minimum: 18 }, 'yup.number().integer().min(18)'],
    [{ type: 'integer', maximum: 99 }, 'yup.number().integer()'],
  ])('integer(%o) → %s', (input, expected) => {
    expect(integer(input)).toBe(expected)
  })
})
