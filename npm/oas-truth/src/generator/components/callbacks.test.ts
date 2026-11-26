import { describe, expect, it } from 'vite-plus/test'

import { makeAdapter } from '../../adapter/index.js'
import type { Components } from '../../openapi/index.js'
import { makeCallbacksCode, makeCallbacksDeclarations } from './callbacks.js'

const zod = makeAdapter('zod')

describe('makeCallbacksCode', () => {
  it('emits a callback object', () => {
    const components = {
      callbacks: {
        OnEvent: { '{$url}': { post: { responses: { '200': { description: 'OK' } } } } },
      },
    } as unknown as Components
    expect(makeCallbacksCode(components, zod, false)).toBe(
      'export const OnEventCallback={"{$url}":{post:{responses:{"200":{description:"OK"}}}}}',
    )
  })

  it('inlines a non-$ref schema inside a callback operation as zod', () => {
    const components = {
      callbacks: {
        OnEvent: {
          '{$url}': {
            post: {
              requestBody: { content: { 'application/json': { schema: { type: 'string' } } } },
            },
          },
        },
      },
    } as unknown as Components
    expect(makeCallbacksCode(components, zod, false)).toBe(
      'export const OnEventCallback={"{$url}":{post:{requestBody:{content:{"application/json":{schema:z.string()}}}}}}',
    )
  })

  it('appends as const when readonly', () => {
    const components = {
      callbacks: { C: { '{$url}': { post: { responses: { '200': { description: 'OK' } } } } } },
    } as unknown as Components
    expect(makeCallbacksCode(components, zod, true)).toBe(
      'export const CCallback={"{$url}":{post:{responses:{"200":{description:"OK"}}}}} as const',
    )
  })

  it('drops a $ref callback but keeps sibling inline callbacks', () => {
    const components = {
      callbacks: {
        Ref: { $ref: '#/components/callbacks/Shared' },
        OnEvent: { '{$url}': { post: { responses: { '200': { description: 'OK' } } } } },
      },
    } as unknown as Components
    expect(makeCallbacksCode(components, zod, false)).toBe(
      'export const OnEventCallback={"{$url}":{post:{responses:{"200":{description:"OK"}}}}}',
    )
  })

  it('returns an empty string when every callback is a $ref', () => {
    const components = {
      callbacks: { C: { $ref: '#/components/callbacks/X' } },
    } as unknown as Components
    expect(makeCallbacksCode(components, zod, false)).toBe('')
  })

  it('returns an empty string when callbacks is missing', () => {
    expect(makeCallbacksCode({}, zod, false)).toBe('')
  })

  it('returns an empty string when callbacks is empty', () => {
    expect(makeCallbacksCode({ callbacks: {} }, zod, false)).toBe('')
  })
})

describe('makeCallbacksDeclarations', () => {
  it('returns entries without an import line and skips a $ref', () => {
    expect(
      makeCallbacksDeclarations({ callbacks: { OnEvent: { '{$url}': {} } } }, zod).map(
        (d) => d.varName,
      ),
    ).toStrictEqual(['OnEventCallback'])
    expect(makeCallbacksDeclarations({}, zod)).toStrictEqual([])
    expect(
      makeCallbacksDeclarations(
        { callbacks: { R: { $ref: '#/components/callbacks/X' } } } as never,
        zod,
      ),
    ).toStrictEqual([])
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
      callbacks: {
        C: {
          '{$url}': {
            post: {
              requestBody: { content: { 'application/json': { schema: filter } } },
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      },
    } as unknown as Components
    const code = makeCallbacksCode(components, zod, false)
    expect(code).toContain(ownValues)
    expect(code).not.toContain('"ComparisonFilter"')
  })
})
