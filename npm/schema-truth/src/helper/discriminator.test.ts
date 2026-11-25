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

  it('keeps the schema names when members share a value or a mapping key claims it', () => {
    const shared = {
      Cat: { properties: { petType: { enum: ['Cat', 'Dog'] } } },
      Dog: { properties: { petType: { enum: ['Cat', 'Dog'] } } },
      Bird: { properties: { petType: { const: 'bird' } } },
      Fish: { properties: { petType: { const: 'fish' } } },
      Null: { properties: { petType: null as unknown as JSONSchema } },
    } satisfies { [name: string]: JSONSchema }
    const result = discriminatedMembers(
      { discriminator: { propertyName: 'petType', mapping: { fish: '#/$defs/Bird' } } },
      ['Cat', 'Dog', 'Bird', 'Fish', 'Null'].map((name) => ({ $ref: `#/$defs/${name}` })),
      shared,
    )
    expect(result?.members.map((m) => m.values)).toStrictEqual([
      ['Cat'],
      ['Dog'],
      ['fish'],
      ['Fish'],
      ['Null'],
    ])
  })

  it('keeps the distinct own values and claims a fallback name', () => {
    const defs = {
      Cat: { properties: { petType: { enum: ['cat', 'animal'] } } },
      Dog: { properties: { petType: { enum: ['dog', 'animal'] } } },
      Cmp: { properties: { petType: { const: 'Open' } } },
      Open: { properties: { petType: { type: 'string' } } },
    } satisfies { [name: string]: JSONSchema }
    const result = discriminatedMembers(
      { discriminator: { propertyName: 'petType' } },
      ['Cat', 'Dog', 'Cmp', 'Open'].map((name) => ({ $ref: `#/$defs/${name}` })),
      defs,
    )
    expect(result?.members.map((m) => m.values)).toStrictEqual([
      ['cat'],
      ['dog'],
      ['Cmp'],
      ['Open'],
    ])
  })

  it("drops a member whose schema name is another schema's mapping key (#74)", () => {
    const defs = {
      Cmp: { properties: { type: { enum: ['eq', 'ne'] } } },
      Cpd: { properties: { type: { type: 'string' } } },
      Alias: { properties: { type: { type: 'string' } } },
      Other: { properties: { type: { const: 'Cpd' } } },
    } satisfies { [name: string]: JSONSchema }
    const result = discriminatedMembers(
      { discriminator: { propertyName: 'type', mapping: { Cpd: '#/$defs/Alias' } } },
      ['Cmp', 'Cpd', 'Alias', 'Other'].map((name) => ({ $ref: `#/$defs/${name}` })),
      defs,
    )
    expect(result?.members.map((m) => m.values)).toStrictEqual([
      ['eq', 'ne'],
      undefined,
      ['Cpd'],
      ['Other'],
    ])
  })
})
