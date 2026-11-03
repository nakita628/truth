import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import { cyclicDefinitionNames, hasRootSelfReference } from './cyclic.js'

describe('hasRootSelfReference', () => {
  it('finds a whole-document reference nested in the body', () => {
    expect(
      hasRootSelfReference({
        type: 'object',
        properties: { children: { type: 'array', items: { $ref: '#' } } },
      }),
    ).toBe(true)
  })

  it('treats an empty $ref as a self reference', () => {
    expect(hasRootSelfReference({ type: 'object', properties: { self: { $ref: '' } } })).toBe(true)
  })

  it('returns false without a self reference', () => {
    expect(
      hasRootSelfReference({
        type: 'object',
        properties: { a: { $ref: '#/$defs/A' } },
      }),
    ).toBe(false)
  })

  it('ignores self references that only occur inside definitions/$defs', () => {
    expect(
      hasRootSelfReference({
        type: 'object',
        properties: { a: { type: 'string' } },
        $defs: { A: { $ref: '#' } },
        definitions: { B: { $ref: '#' } },
      }),
    ).toBe(false)
  })

  it('honours a custom self-reference predicate', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: { self: { $ref: '#/components/schemas/User' } },
    }
    expect(hasRootSelfReference(schema)).toBe(false)
    expect(hasRootSelfReference(schema, (ref) => ref === '#/components/schemas/User')).toBe(true)
  })
})

describe('cyclicDefinitionNames', () => {
  it('returns an empty set without definitions', () => {
    expect([...cyclicDefinitionNames({ type: 'object' })]).toStrictEqual([])
  })

  it('returns an empty set for an acyclic chain', () => {
    expect([
      ...cyclicDefinitionNames({
        $defs: {
          A: { properties: { b: { $ref: '#/$defs/B' } } },
          B: { properties: { c: { $ref: '#/$defs/C' } } },
          C: { type: 'string' },
        },
      }),
    ]).toStrictEqual([])
  })

  it('finds a mutual cycle', () => {
    expect(
      [
        ...cyclicDefinitionNames({
          $defs: {
            A: { properties: { b: { $ref: '#/$defs/B' } } },
            B: { properties: { a: { $ref: '#/$defs/A' } } },
          },
        }),
      ].sort(),
    ).toStrictEqual(['A', 'B'])
  })

  it('finds a self loop', () => {
    expect([
      ...cyclicDefinitionNames({
        definitions: { Node: { properties: { next: { $ref: '#/definitions/Node' } } } },
      }),
    ]).toStrictEqual(['Node'])
  })

  it('reports only the definitions on the cycle', () => {
    expect(
      [
        ...cyclicDefinitionNames({
          $defs: {
            Entry: { properties: { a: { $ref: '#/$defs/A' } } },
            A: { properties: { b: { $ref: '#/$defs/B' } } },
            B: { properties: { a: { $ref: '#/$defs/A' } } },
            Leaf: { type: 'string' },
          },
        }),
      ].sort(),
    ).toStrictEqual(['A', 'B'])
  })

  it('follows the bare #Name shorthand', () => {
    expect(
      [
        ...cyclicDefinitionNames({
          definitions: {
            A: { properties: { b: { $ref: '#B' } } },
            B: { properties: { a: { $ref: '#A' } } },
          },
        }),
      ].sort(),
    ).toStrictEqual(['A', 'B'])
  })

  it('ignores references to names that are not defined locally', () => {
    expect([
      ...cyclicDefinitionNames({
        $defs: { A: { properties: { x: { $ref: '#/$defs/Missing' } } } },
      }),
    ]).toStrictEqual([])
  })

  it('finds a cycle reached through an array item', () => {
    expect([
      ...cyclicDefinitionNames({
        $defs: {
          Node: {
            properties: { children: { type: 'array', items: { $ref: '#/$defs/Node' } } },
          },
        },
      }),
    ]).toStrictEqual(['Node'])
  })

  it('finds a cycle reached through a combinator array', () => {
    expect(
      [
        ...cyclicDefinitionNames({
          $defs: {
            A: { anyOf: [{ type: 'null' }, { $ref: '#/$defs/B' }] },
            B: { allOf: [{ $ref: '#/$defs/A' }] },
          },
        }),
      ].sort(),
    ).toStrictEqual(['A', 'B'])
  })
})
