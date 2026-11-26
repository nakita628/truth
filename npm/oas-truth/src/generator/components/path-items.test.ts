import { describe, expect, it } from 'vite-plus/test'

import { makeAdapter } from '../../adapter/index.js'
import type { Components } from '../../openapi/index.js'
import { makePathItemsCode, makePathItemsDeclarations } from './path-items.js'

const zod = makeAdapter('zod')

describe('makePathItemsCode', () => {
  it('emits a path item object', () => {
    const components = {
      pathItems: { Item: { get: { responses: { '200': { description: 'OK' } } } } },
    } as unknown as Components
    expect(makePathItemsCode(components, zod, false)).toBe(
      'export const ItemPathItem={get:{responses:{"200":{description:"OK"}}}}',
    )
  })

  it('resolves a $ref schema inside an operation', () => {
    const components = {
      pathItems: {
        Item: {
          post: {
            requestBody: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
            },
          },
        },
      },
    } as unknown as Components
    expect(makePathItemsCode(components, zod, false)).toBe(
      'export const ItemPathItem={post:{requestBody:{content:{"application/json":{schema:UserSchema}}}}}',
    )
  })

  it('inlines a non-$ref schema inside an operation as zod', () => {
    const components = {
      pathItems: {
        Item: {
          post: {
            requestBody: {
              content: { 'application/json': { schema: { type: 'string' } } },
            },
          },
        },
      },
    } as unknown as Components
    expect(makePathItemsCode(components, zod, false)).toBe(
      'export const ItemPathItem={post:{requestBody:{content:{"application/json":{schema:z.string()}}}}}',
    )
  })

  it('appends as const when readonly', () => {
    const components = {
      pathItems: { P: { summary: 's' } },
    } as unknown as Components
    expect(makePathItemsCode(components, zod, true)).toBe(
      'export const PPathItem={summary:"s"} as const',
    )
  })

  it('joins multiple path items with a semicolon', () => {
    const components = {
      pathItems: { A: { summary: 'a' }, B: { summary: 'b' } },
    } as unknown as Components
    expect(makePathItemsCode(components, zod, false)).toBe(
      'export const APathItem={summary:"a"};export const BPathItem={summary:"b"}',
    )
  })

  it('returns an empty string when pathItems is missing', () => {
    expect(makePathItemsCode({}, zod, false)).toBe('')
  })

  it('returns an empty string when pathItems is empty', () => {
    expect(makePathItemsCode({ pathItems: {} }, zod, false)).toBe('')
  })
})

describe('makePathItemsDeclarations', () => {
  it('returns entries without an import line', () => {
    expect(
      makePathItemsDeclarations(
        { pathItems: { Item: { get: {} }, Other: { get: {} } } } as never,
        zod,
      ).map((d) => d.varName),
    ).toStrictEqual(['ItemPathItem', 'OtherPathItem'])
    expect(makePathItemsDeclarations({}, zod)).toStrictEqual([])
  })
})

// An inline discriminator over members that hold their own values (#109).
const filterSchemas = {
  ComparisonFilter: {
    type: 'object',
    properties: { type: { type: 'string', enum: ['eq', 'ne'] }, key: { type: 'string' } },
    required: ['type', 'key'],
  },
  CompoundFilter: {
    type: 'object',
    properties: { type: { type: 'string', enum: ['and', 'or'] } },
    required: ['type'],
  },
}
const filter = {
  oneOf: [
    { $ref: '#/components/schemas/ComparisonFilter' },
    { $ref: '#/components/schemas/CompoundFilter' },
  ],
  discriminator: { propertyName: 'type' },
}
const ownValues = 'z.intersection(ComparisonFilterSchema,z.object({type:z.enum(["eq","ne"])}))'

describe("an inline discriminator takes its members' own values (#109)", () => {
  it('pins them from components.schemas', () => {
    const components = {
      schemas: filterSchemas,
      pathItems: {
        P: {
          post: {
            requestBody: { content: { 'application/json': { schema: filter } } },
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    } as unknown as Components
    const code = makePathItemsCode(components, zod, false)
    expect(code).toContain(ownValues)
    expect(code).not.toContain('"ComparisonFilter"')
  })
})
