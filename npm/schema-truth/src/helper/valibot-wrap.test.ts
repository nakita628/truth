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
      'v.pipe(v.optional(v.pipe(v.unknown(),v.metadata({type:"boolean"}),v.pipe(v.string(),v.transform((input)=>input==="true"))),"true"),v.metadata({default:true}))',
    )
  })
})
