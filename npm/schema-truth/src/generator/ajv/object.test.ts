import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { object } from './object.js'

describe('object', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'object' }, "{type:'object'}"],
    [
      { type: 'object', properties: { name: { type: 'string' } } },
      "{type:'object',properties:{name:{type:'string'}}}",
    ],
    [
      {
        type: 'object',
        properties: { name: { type: 'string' }, age: { type: 'integer' } },
        required: ['name'],
      },
      "{type:'object',properties:{name:{type:'string'},age:{type:'integer'}},required:[\"name\"]}",
    ],
    [
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          age: { type: 'integer', minimum: 0 },
        },
        required: ['name', 'email'],
      },
      "{type:'object',properties:{name:{type:'string'},email:{type:'string',format:'email'},age:{type:'integer',minimum:0}},required:[\"name\",\"email\"]}",
    ],
    [
      {
        type: 'object',
        properties: {
          'full-name': { type: 'string' },
        },
        required: ['full-name'],
      },
      '{type:\'object\',properties:{"full-name":{type:\'string\'}},required:["full-name"]}',
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
      },
      "{type:'object',properties:{user:{type:'object',properties:{name:{type:'string'}},required:[\"name\"]}}}",
    ],
    [
      {
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string' } },
          role: { enum: ['admin', 'user'] },
        },
        additionalProperties: false,
        minProperties: 1,
      },
      "{type:'object',properties:{tags:{},role:{}}}",
    ],
    [{ type: 'object', required: ['name'] }, '{type:\'object\',required:["name"]}'],
  ])('object(%o) -> %s', (schema, expected) => {
    expect(object(schema)).toBe(expected)
  })
})
