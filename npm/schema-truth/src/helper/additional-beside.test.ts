import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import { additionalBesideCombinator } from './additional-beside.js'

describe('additionalBesideCombinator (#138)', () => {
  it('holds the keys the node leaves to additionalProperties beside an allOf', () => {
    const schema: JSONSchema = {
      allOf: [{ type: 'object' }],
      properties: { a: { type: 'string' } },
      patternProperties: { '^x': { type: 'number' } },
      additionalProperties: false,
    }
    expect(additionalBesideCombinator(schema)).toStrictEqual({
      allOf: [
        {
          allOf: [{ type: 'object' }],
          properties: { a: { type: 'string' } },
          patternProperties: { '^x': { type: 'number' } },
        },
        {
          anyOf: [
            { not: { type: 'object' } },
            {
              allOf: [{ type: 'object' }],
              properties: { a: {} },
              patternProperties: { '^x': {} },
              unevaluatedProperties: false,
            },
          ],
        },
      ],
    })
  })

  it('leaves out an unevaluatedProperties that additionalProperties shadows', () => {
    const schema: JSONSchema = {
      type: 'object',
      allOf: [{ properties: { a: {} } }],
      additionalProperties: false,
      unevaluatedProperties: false,
      'x-unevaluatedProperties-message': 'closed',
    }
    expect(additionalBesideCombinator(schema)).toStrictEqual({
      type: 'object',
      allOf: [
        {
          type: 'object',
          allOf: [{ properties: { a: {} } }],
        },
        {
          anyOf: [
            { not: { type: 'object' } },
            {
              allOf: [{ type: 'object' }],
              unevaluatedProperties: false,
              'x-unevaluatedProperties-message': 'closed',
            },
          ],
        },
      ],
    })
  })

  it('keeps the default, fallbacks and metadata on the whole node', () => {
    const schema: JSONSchema = {
      allOf: [{ type: 'object' }],
      default: {},
      description: 'box',
      'x-catch': {},
      additionalProperties: false,
    }
    expect(additionalBesideCombinator(schema)).toStrictEqual({
      default: {},
      description: 'box',
      'x-catch': {},
      allOf: [
        { allOf: [{ type: 'object' }] },
        {
          anyOf: [
            { not: { type: 'object' } },
            { allOf: [{ type: 'object' }], unevaluatedProperties: false },
          ],
        },
      ],
    })
  })

  it.each<[string, JSONSchema, unknown]>([
    [
      'a null default on a nullable node',
      {
        type: ['object', 'null'],
        allOf: [{ type: 'object' }],
        additionalProperties: false,
        default: null,
      },
      null,
    ],
    [
      'a default an allOf member carries',
      { allOf: [{ type: 'object' }, { default: {} }], additionalProperties: false },
      {},
    ],
    [
      'an undeclared key additionalProperties takes',
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        allOf: [{ type: 'object' }],
        additionalProperties: { type: 'number' },
        default: { a: 'x', n: 1 },
      },
      { a: 'x', n: 1 },
    ],
  ])('keeps %s on the whole node', (_, schema, value) => {
    const split = additionalBesideCombinator(schema)
    expect(split?.default).toStrictEqual(value)
    expect(split?.allOf?.[0]?.allOf?.some((member) => member.default !== undefined)).not.toBe(true)
  })

  it.each<[string, JSONSchema]>([
    ['no combinator', { type: 'object', additionalProperties: false }],
    ['additionalProperties: true', { anyOf: [{ type: 'object' }], additionalProperties: true }],
    ['additionalProperties: {}', { allOf: [{ type: 'object' }], additionalProperties: {} }],
    ['no additionalProperties', { oneOf: [{ type: 'object' }] }],
  ])('leaves a node with %s alone', (_, schema) => {
    expect(additionalBesideCombinator(schema)).toBeUndefined()
  })
})
