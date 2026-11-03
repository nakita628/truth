import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import { separatePolymorphicBases, withPolymorphicBases } from './polymorphic-base.js'

const connection: JSONSchema = {
  type: 'object',
  properties: { name: { type: 'string' }, type: { type: 'string', enum: ['Sample', 'Kafka'] } },
  discriminator: { propertyName: 'type' },
  oneOf: [{ $ref: '#/$defs/SampleConnection' }, { $ref: '#/$defs/KafkaConnection' }],
}

describe('separatePolymorphicBases', () => {
  it('points the subtypes at the base without its union (#402)', () => {
    const result = separatePolymorphicBases({
      Connection: connection,
      SampleConnection: { allOf: [{ $ref: '#/$defs/Connection' }] },
      KafkaConnection: {
        allOf: [
          { $ref: '#/$defs/Connection' },
          { type: 'object', properties: { bootstrapServers: { type: 'string' } } },
        ],
      },
    })
    expect(result).toStrictEqual({
      Connection: connection,
      ConnectionBase: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['Sample', 'Kafka'] },
        },
      },
      SampleConnection: { allOf: [{ $ref: '#/$defs/ConnectionBase' }] },
      KafkaConnection: {
        allOf: [
          { $ref: '#/$defs/ConnectionBase' },
          { type: 'object', properties: { bootstrapServers: { type: 'string' } } },
        ],
      },
    })
  })

  it('picks a base name no definition has', () => {
    const result = separatePolymorphicBases({
      Pet: { oneOf: [{ $ref: '#/components/schemas/Cat' }] },
      PetBase: { type: 'string' },
      Cat: { allOf: [{ $ref: '#/components/schemas/Pet' }] },
    })
    expect(result.PetBase2).toStrictEqual({})
    expect(result.Cat).toStrictEqual({ allOf: [{ $ref: '#/components/schemas/PetBase2' }] })
  })

  it('returns the definitions as given when no subtype extends its union', () => {
    const definitions = {
      Pet: { oneOf: [{ $ref: '#/$defs/Cat' }] },
      Cat: { type: 'object', properties: { meow: { type: 'boolean' } } },
    } satisfies { readonly [name: string]: JSONSchema }
    expect(separatePolymorphicBases(definitions)).toBe(definitions)
  })
})

describe('withPolymorphicBases', () => {
  it('returns the document as given when nothing changes', () => {
    const schema: JSONSchema = { $defs: { A: { type: 'string' } } }
    expect(withPolymorphicBases(schema)).toBe(schema)
  })
})
