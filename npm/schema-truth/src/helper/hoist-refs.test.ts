import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import { hoistNestedRefs } from './hoist-refs.js'

describe('hoistNestedRefs', () => {
  it('hoists what a nested pointer reaches into a definition (#404)', () => {
    const schema: JSONSchema = {
      $defs: {
        Root: {
          type: 'object',
          properties: {
            node: { $ref: '#/$defs/Root/definitions/Node' },
          },
          definitions: {
            Node: {
              type: 'object',
              properties: {
                children: { type: 'array', items: { $ref: '#/$defs/Root/definitions/Node' } },
              },
            },
          },
        },
      },
    }
    const node = {
      type: 'object',
      properties: { children: { type: 'array', items: { $ref: '#/$defs/Node' } } },
    }
    expect(hoistNestedRefs(schema)).toStrictEqual({
      $defs: {
        Root: {
          type: 'object',
          properties: { node: { $ref: '#/$defs/Node' } },
          definitions: { Node: node },
        },
        Node: node,
      },
    })
  })

  it('numbers a hoisted name a definition already has', () => {
    const result = hoistNestedRefs({
      definitions: { Tag: { type: 'string' } },
      properties: {
        a: { $ref: '#/properties/b/definitions/Tag' },
        b: { definitions: { Tag: { type: 'integer' } } },
      },
    })
    expect(result.definitions).toStrictEqual({
      Tag: { type: 'string' },
      Tag2: { type: 'integer' },
    })
    expect(result.properties?.a).toStrictEqual({ $ref: '#/definitions/Tag2' })
  })

  it('leaves data keywords and definition references alone', () => {
    const schema: JSONSchema = {
      $defs: { A: { type: 'string' } },
      properties: {
        a: { $ref: '#/$defs/A' },
        b: { const: { $ref: '#/$defs/A/type' } },
      },
    }
    expect(hoistNestedRefs(schema)).toBe(schema)
  })
})
