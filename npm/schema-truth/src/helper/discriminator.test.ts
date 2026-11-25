import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import { discriminatedMembers } from './discriminator.js'

describe('discriminatedMembers', () => {
  const members: JSONSchema[] = [
    { $ref: '#/$defs/Cat' },
    { $ref: '#/components/schemas/Dog' },
    { type: 'object' },
  ]

  it('reads the mapping keys that name each member, else the definition name (#16)', () => {
    expect(
      discriminatedMembers(
        {
          discriminator: {
            propertyName: 'kind',
            mapping: { cat: '#/$defs/Cat', kitten: '#/$defs/Cat' },
          },
        },
        members,
      ),
    ).toStrictEqual({
      propertyName: 'kind',
      members: [
        { member: members[0], values: ['cat', 'kitten'] },
        { member: members[1], values: ['Dog'] },
        { member: members[2], values: undefined },
      ],
    })
  })

  it('is undefined without a discriminator property', () => {
    expect(discriminatedMembers({}, members)).toBeUndefined()
  })
})

describe("discriminatedMembers reads a member's own values (#73)", () => {
  const definitions = {
    Cmp: { type: 'object', properties: { type: { type: 'string', enum: ['eq', 'ne', 1] } } },
    Cpd: { type: 'object', properties: { type: { const: 'and' } } },
    Base: { allOf: [{ properties: { type: { const: 'base' } } }] },
    Open: { type: 'object', properties: { type: { type: 'string' } } },
  } satisfies { [name: string]: JSONSchema }
  const members: JSONSchema[] = ['Cmp', 'Cpd', 'Base', 'Open', 'Missing'].map((name) => ({
    $ref: `#/$defs/${name}`,
  }))

  it('prefers the const or enum strings, then the schema name', () => {
    const result = discriminatedMembers(
      { discriminator: { propertyName: 'type' } },
      members,
      definitions,
    )
    expect(result?.members.map((m) => m.values)).toStrictEqual([
      ['eq', 'ne'],
      ['and'],
      ['base'],
      ['Open'],
      ['Missing'],
    ])
  })

  it('keeps a mapping entry over the own values', () => {
    const result = discriminatedMembers(
      { discriminator: { propertyName: 'type', mapping: { cmp: '#/$defs/Cmp' } } },
      members.slice(0, 1),
      definitions,
    )
    expect(result?.members.map((m) => m.values)).toStrictEqual([['cmp']])
  })

  it('does not read an inherited name as a definition', () => {
    const result = discriminatedMembers(
      { discriminator: { propertyName: 'type' } },
      [{ $ref: '#/$defs/constructor' }],
      definitions,
    )
    expect(result?.members.map((m) => m.values)).toStrictEqual([['constructor']])
  })
})
