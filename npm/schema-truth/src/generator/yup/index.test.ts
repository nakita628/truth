import { describe, expect, it } from 'vite-plus/test'

import { schemaToYup } from './index.js'

describe('schemaToYup', () => {
  it('should generate simple schema', () => {
    const result = schemaToYup({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    })
    const expected = `import * as yup from 'yup'

export const Schema = yup.object({name:yup.string().required(),age:yup.number()})

export type Schema = yup.InferType<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should generate schema with title', () => {
    const result = schemaToYup({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import * as yup from 'yup'

export const User = yup.object({name:yup.string()})

export type User = yup.InferType<typeof User>`
    expect(result).toBe(expected)
  })

  it('should emit email, integer and minimum in one object', () => {
    const result = schemaToYup({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 0 },
      },
      required: ['name', 'email'],
    })
    const expected = `import * as yup from 'yup'

export const User = yup.object({name:yup.string().required(),email:yup.string().email().required(),age:yup.number().integer().min(0)})

export type User = yup.InferType<typeof User>`
    expect(result).toBe(expected)
  })

  it('should omit type export when exportType is false', () => {
    const result = schemaToYup(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      { exportType: false },
    )
    const expected = `import * as yup from 'yup'

export const Schema = yup.object({name:yup.string()})`
    expect(result).toBe(expected)
  })

  it('should handle empty schema as mixed', () => {
    const result = schemaToYup({}, { exportType: false })
    expect(result).toBe(`import * as yup from 'yup'\n\nexport const Schema = yup.mixed()`)
  })

  it('should use OpenAPI naming for hyphenated titles', () => {
    const result = schemaToYup(
      {
        title: 'user-profile',
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
      { openapi: true, exportType: false },
    )
    expect(result).toBe(
      `import * as yup from 'yup'\n\nexport const UserProfile = yup.object({name:yup.string().required()})`,
    )
  })

  it('should not throw on unsupported combinators', () => {
    const result = schemaToYup(
      {
        title: 'Shape',
        type: 'object',
        properties: {
          value: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        },
        required: ['value'],
      },
      { exportType: false },
    )
    expect(result).toBe(
      `import * as yup from 'yup'\n\nexport const Shape = yup.object({value:yup.mixed().required()})`,
    )
  })
})
