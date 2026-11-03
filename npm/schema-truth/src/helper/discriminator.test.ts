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
