import { describe, expect, it } from 'vite-plus/test'

import { schemaToAjv } from './index.js'

describe('schemaToAjv', () => {
  it('should generate a simple object schema without formats', () => {
    const result = schemaToAjv({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
      required: ['name'],
    })
    const expected = `import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {type:'object',properties:{name:{type:'string'},age:{type:'integer'}},required:["name"]}

export const validate = ajv.compile(schema)`
    expect(result).toBe(expected)
  })

  it('should import addFormats when format email is emitted', () => {
    const result = schemaToAjv({
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 0 },
      },
      required: ['name', 'email'],
    })
    const expected = `import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv()
addFormats(ajv)

export const schema = {type:'object',properties:{name:{type:'string'},email:{type:'string',format:'email'},age:{type:'integer',minimum:0}},required:["name","email"]}

export const validate = ajv.compile(schema)`
    expect(result).toBe(expected)
  })

  it('should ignore title and still export schema / validate', () => {
    const result = schemaToAjv({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {type:'object',properties:{name:{type:'string'}}}

export const validate = ajv.compile(schema)`
    expect(result).toBe(expected)
  })

  it('should emit an empty schema for an unsupported root node', () => {
    const result = schemaToAjv({
      oneOf: [{ type: 'string' }, { type: 'number' }],
    })
    const expected = `import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {}

export const validate = ajv.compile(schema)`
    expect(result).toBe(expected)
  })

  it('should emit an empty schema for a $ref / $defs document', () => {
    const result = schemaToAjv({
      $ref: '#/$defs/User',
      $defs: {
        User: { type: 'string' },
      },
    })
    const expected = `import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {}

export const validate = ajv.compile(schema)`
    expect(result).toBe(expected)
  })

  it('should drop unsupported keywords and x-* extensions', () => {
    const result = schemaToAjv({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          pattern: '^[A-Z]',
          'x-error-message': 'Name is required',
        },
        age: { type: 'integer', minimum: 0, maximum: 150, multipleOf: 1 },
        role: { enum: ['admin', 'user'] },
      },
      additionalProperties: false,
      required: ['name'],
    })
    const expected = `import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {type:'object',properties:{name:{type:'string'},age:{type:'integer',minimum:0},role:{}},required:["name"]}

export const validate = ajv.compile(schema)`
    expect(result).toBe(expected)
  })

  it('should not import addFormats when format is unsupported', () => {
    const result = schemaToAjv({
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
    })
    expect(result).toBe(`import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {type:'object',properties:{id:{type:'string'}}}

export const validate = ajv.compile(schema)`)
  })

  it('should import addFormats for a nested email', () => {
    const result = schemaToAjv({
      type: 'object',
      properties: {
        contact: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
      },
    })
    const expected = `import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv()
addFormats(ajv)

export const schema = {type:'object',properties:{contact:{type:'object',properties:{email:{type:'string',format:'email'}}}}}

export const validate = ajv.compile(schema)`
    expect(result).toBe(expected)
  })

  it('should generate a root string schema', () => {
    const result = schemaToAjv({ type: 'string', format: 'email' })
    const expected = `import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv()
addFormats(ajv)

export const schema = {type:'string',format:'email'}

export const validate = ajv.compile(schema)`
    expect(result).toBe(expected)
  })

  it('should generate a root number schema', () => {
    const result = schemaToAjv({ type: 'number', minimum: 0 })
    const expected = `import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {type:'number',minimum:0}

export const validate = ajv.compile(schema)`
    expect(result).toBe(expected)
  })

  it('should accept exportType without emitting JSONSchemaType', () => {
    const schema = {
      type: 'object' as const,
      properties: { name: { type: 'string' as const } },
    }
    const without = schemaToAjv(schema)
    const withFlag = schemaToAjv(schema, { exportType: true })
    expect(withFlag).toBe(without)
    expect(withFlag.includes('JSONSchemaType')).toBe(false)
    expect(withFlag.includes('export type')).toBe(false)
  })

  it('should emit import and export const for an empty document', () => {
    const result = schemaToAjv({})
    expect(result).toBe(`import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {}

export const validate = ajv.compile(schema)`)
  })
})
