import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import { collectDefinitions, examplesOf, itemsSchemaOf } from './schema.js'

describe('collectDefinitions', () => {
  it('reads definitions and $defs as one map, $defs winning', () => {
    expect(
      collectDefinitions({
        definitions: { A: { type: 'string' }, B: { type: 'number' } },
        $defs: { B: { type: 'boolean' } },
      }),
    ).toStrictEqual({ A: { type: 'string' }, B: { type: 'boolean' } })
  })

  it('is empty for a document without definitions', () => {
    expect(collectDefinitions({ type: 'string' })).toStrictEqual({})
  })
})

describe('itemsSchemaOf', () => {
  it.concurrent.each<[JSONSchema['items'], JSONSchema | undefined]>([
    [{ type: 'string' }, { type: 'string' }],
    [[{ type: 'string' }, { type: 'number' }], { type: 'string' }],
    [[], undefined],
    [true, undefined],
    [false, undefined],
    [undefined, undefined],
  ])('itemsSchemaOf(%j) → %j', (items, expected) => {
    expect(itemsSchemaOf(items)).toStrictEqual(expected)
  })
})

describe('examplesOf', () => {
  it('prefers examples, lifts a single example, and is undefined without either', () => {
    expect(examplesOf({ examples: [1, 2], example: 3 })).toStrictEqual([1, 2])
    expect(examplesOf({ example: 3 })).toStrictEqual([3])
    expect(examplesOf({ example: null })).toStrictEqual([null])
    expect(examplesOf({})).toBeUndefined()
  })
})
