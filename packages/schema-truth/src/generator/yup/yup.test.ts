import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { yup } from './yup.js'

describe('yup', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, 'yup.string()'],
    [{ type: 'string', format: 'email' }, 'yup.string().email()'],
    [{ type: 'number' }, 'yup.number()'],
    [{ type: 'number', minimum: 0 }, 'yup.number().min(0)'],
    [{ type: 'integer' }, 'yup.number().integer()'],
    [{ type: 'integer', minimum: 0 }, 'yup.number().integer().min(0)'],
    [{ type: 'object' }, 'yup.object({})'],
    [
      { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
      'yup.object({name:yup.string().required()})',
    ],
    [{}, 'yup.mixed()'],
    [{ type: 'boolean' }, 'yup.mixed()'],
    [{ type: 'array', items: { type: 'string' } }, 'yup.mixed()'],
    [{ oneOf: [{ type: 'string' }, { type: 'number' }] }, 'yup.mixed()'],
    [{ $ref: '#/$defs/User' }, 'yup.mixed()'],
    [
      {
        type: 'object',
        properties: {
          kind: { type: 'string' },
          value: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        },
        required: ['kind', 'value'],
      },
      'yup.object({kind:yup.string().required(),value:yup.mixed().required()})',
    ],
  ])('yup(%o) → %s', (input, expected) => {
    expect(yup(input)).toBe(expected)
  })
})
