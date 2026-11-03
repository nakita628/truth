import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { object } from './object.js'

describe('object', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'object' }, 'yup.object({})'],
    [
      { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
      'yup.object({foo:yup.string().required()})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
        required: ['foo'],
      },
      'yup.object({foo:yup.string().required(),bar:yup.number()})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' } },
      },
      'yup.object({foo:yup.string()})',
    ],
    [
      {
        type: 'object',
        properties: { 'foo-bar': { type: 'string' } },
        required: ['foo-bar'],
      },
      'yup.object({"foo-bar":yup.string().required()})',
    ],
    [
      {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        },
        required: ['user'],
      },
      'yup.object({user:yup.object({name:yup.string().required()}).required()})',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input)).toBe(expected)
  })
})
