import { describe, expect, it } from 'vite-plus/test'

import { valibotWrap, wireDocument } from './valibot-wrap.js'

describe('wireDocument (#77)', () => {
  it('drops extensions and OpenAPI-only keywords and writes nullable as a null type', () => {
    expect(
      wireDocument({
        type: 'integer',
        nullable: true,
        format: 'int64',
        example: 1,
        default: 2,
        'x-error-message': 'bad',
      }),
    ).toStrictEqual({ type: ['integer', 'null'], format: 'int64', examples: [1] })
  })

  it('keeps property names that look like keywords and cleans nested schemas', () => {
    expect(
      wireDocument({
        type: 'object',
        properties: { default: { type: 'string', 'x-brand': 'B' } },
        items: { type: 'boolean', nullable: true },
      }),
    ).toStrictEqual({
      type: 'object',
      properties: { default: { type: 'string' } },
      items: { type: ['boolean', 'null'] },
    })
  })

  it('keeps a nested default and leaves a defaulted property out of required', () => {
    expect(
      wireDocument({
        type: 'object',
        default: {},
        required: ['page', 'size'],
        properties: { page: { type: 'integer', default: 1 }, size: { type: 'integer' } },
      }),
    ).toStrictEqual({
      type: 'object',
      required: ['size'],
      properties: { page: { type: 'integer', default: 1 }, size: { type: 'integer' } },
    })
  })

  it('writes boolean exclusive bounds as numbers and adds null to a nullable enum', () => {
    expect(
      wireDocument({
        type: 'integer',
        minimum: 1,
        exclusiveMinimum: true,
        maximum: 9,
        exclusiveMaximum: false,
        nullable: true,
        enum: [2, 3],
      }),
    ).toStrictEqual({
      type: ['integer', 'null'],
      exclusiveMinimum: 1,
      maximum: 9,
      enum: [2, 3, null],
    })
  })

  it('is undefined when a $ref sits under additionalItems or dependencies', () => {
    expect(wireDocument({ additionalItems: { $ref: '#/$defs/A' } })).toBeUndefined()
    expect(wireDocument({ dependencies: { a: { $ref: '#/$defs/A' } } })).toBeUndefined()
  })

  it('is undefined when a $ref sits inside', () => {
    expect(
      wireDocument({ type: 'array', items: { $ref: '#/components/schemas/A' } }),
    ).toBeUndefined()
  })
})

describe('valibotWrap wireDocument', () => {
  it('puts the document ahead of the transform, inside v.optional', () => {
    expect(
      valibotWrap(
        'v.pipe(v.string(),v.transform((input)=>input==="true"))',
        { type: 'boolean', default: true },
        { stringWire: true, wireDocument: true },
      ),
    ).toBe(
      'v.pipe(v.optional(v.pipe(v.string(),v.metadata({type:"boolean"}),v.pipe(v.string(),v.transform((input)=>input==="true"))),"true"),v.metadata({default:true}))',
    )
  })
})

describe('valibot wire documents in the generator (#77)', () => {
  it('documents a bigint-format wire integer and keeps a leading string for a union', async () => {
    const { valibot } = await import('../generator/valibot/valibot.js')
    expect(
      valibot({ type: 'integer', format: 'bigint' }, 'S', false, { paramIn: 'query' }),
    ).toMatch(
      /^v\.pipe\(v\.string\(\),v\.metadata\(\{type:"integer",format:"bigint"\}\),v\.pipe\(v\.string\(\),/,
    )
    expect(valibot({ type: 'boolean' }, 'S', false, { paramIn: 'query' })).toMatch(
      /^v\.pipe\(v\.string\(\),v\.metadata\(\{type:"boolean"\}\),v\.pipe\(v\.string\(\),v\.regex\(/,
    )
  })
})
