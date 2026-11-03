import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { string } from './string.js'

describe('string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, 'yup.string()'],
    [{ type: 'string', format: 'email' }, 'yup.string().email()'],
    [{ type: 'string', format: 'uuid' }, 'yup.string()'],
    [{ type: 'string', minLength: 3 }, 'yup.string()'],
  ])('string(%o) → %s', (input, expected) => {
    expect(string(input)).toBe(expected)
  })
})
