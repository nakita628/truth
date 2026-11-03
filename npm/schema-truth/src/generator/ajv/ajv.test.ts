import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { ajv } from './ajv.js'

describe('ajv', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, "{type:'string'}"],
    [{ type: 'string', format: 'email' }, "{type:'string',format:'email'}"],
    [{ type: 'number' }, "{type:'number'}"],
    [{ type: 'number', minimum: 0 }, "{type:'number',minimum:0}"],
    [{ type: 'integer' }, "{type:'integer'}"],
    [{ type: 'integer', minimum: 0 }, "{type:'integer',minimum:0}"],
    [{ type: 'object' }, "{type:'object'}"],
    [
      { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
      "{type:'object',properties:{name:{type:'string'}},required:[\"name\"]}",
    ],
    [{ type: 'boolean' }, '{}'],
    [{ type: 'array', items: { type: 'string' } }, '{}'],
    [{ type: 'null' }, '{}'],
    [{ oneOf: [{ type: 'string' }, { type: 'number' }] }, '{}'],
    [{ anyOf: [{ type: 'string' }] }, '{}'],
    [{ allOf: [{ type: 'string' }] }, '{}'],
    [{ not: { type: 'string' } }, '{}'],
    [{ $ref: '#/definitions/Foo' }, '{}'],
    [{ $ref: '#' }, '{}'],
    [{ enum: ['a', 'b'] }, '{}'],
    [{ const: 'x' }, '{}'],
    [{}, '{}'],
  ])('ajv(%o) -> %s', (schema, expected) => {
    expect(ajv(schema)).toBe(expected)
  })
})
