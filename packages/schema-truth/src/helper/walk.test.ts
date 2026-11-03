import { describe, expect, it } from 'vite-plus/test'

import { hasIfThenElse, hasKeyword, hasNotKeyword, walkSchema } from './walk.js'

describe('walkSchema', () => {
  const schema = {
    type: 'object',
    properties: { a: { type: 'string' }, b: { oneOf: [{ type: 'number' }, { type: 'null' }] } },
    $defs: { D: { type: 'integer' } },
  } as const

  it('yields the root first and every object node under it, but no array', () => {
    // root, properties, a, b, the two oneOf members, $defs, D
    const nodes = [...walkSchema(schema)]
    expect(nodes[0]).toBe(schema)
    expect(nodes).toHaveLength(8)
    expect(nodes.every((node) => !Array.isArray(node))).toBe(true)
  })

  it('leaves definitions alone when asked', () => {
    const types = [...walkSchema(schema, { skipDefinitions: true })].map((node) => node.type)
    expect(types).not.toContain('integer')
    expect(types).toContain('string')
  })

  it('descends into the root without yielding it when asked', () => {
    const nodes = [...walkSchema(schema, { skipRoot: true })]
    expect(nodes).not.toContain(schema)
    expect(nodes).toHaveLength(7)
  })

  it('yields a pruned node but not its children', () => {
    const nodes = [...walkSchema(schema, { prune: (node) => node.type === 'object' })]
    expect(nodes).toStrictEqual([schema])
  })

  it('yields nothing for a non-object root', () => {
    expect([...walkSchema('x')]).toStrictEqual([])
    expect([...walkSchema(null)]).toStrictEqual([])
  })
})

describe('hasKeyword', () => {
  it('finds a keyword at any depth, inside arrays included', () => {
    expect(hasKeyword({ anyOf: [{ not: { type: 'string' } }] }, ['not'])).toBe(true)
    expect(hasKeyword({ anyOf: [{ type: 'string' }] }, ['not'])).toBe(false)
  })

  it('answers the if/then/else and not questions', () => {
    expect(hasIfThenElse({ properties: { a: { else: {} } } })).toBe(true)
    expect(hasIfThenElse({ type: 'object' })).toBe(false)
    expect(hasNotKeyword({ items: { not: {} } })).toBe(true)
    expect(hasNotKeyword({ type: 'array' })).toBe(false)
  })
})
