import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { object } from './object.js'

describe('object', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'object' }, 'v.object({})'],
    [
      { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
      'v.object({foo:v.string()})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
        required: ['foo'],
      },
      'v.object({foo:v.string(),bar:v.optional(v.number())})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' } },
      },
      'v.partial(v.object({foo:v.string()}))',
    ],
    [
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        required: ['test'],
        additionalProperties: false,
      },
      'v.strictObject({test:v.string()})',
    ],
    [
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        required: ['test'],
        additionalProperties: true,
      },
      'v.looseObject({test:v.string()})',
    ],
    [
      {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      'v.record(v.string(),v.string())',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input, 'Schema', false)).toBe(expected)
  })

  describe('minProperties / maxProperties', () => {
    it('emits v.pipe with v.check for minProperties', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            minProperties: 2,
          },
          'Schema',
          false,
        ),
      ).toBe('v.pipe(v.looseObject({a:v.string()}),v.check((input)=>Object.keys(input).length>=2))')
    })

    it('emits both with x-minimum-message / x-maximum-message', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            minProperties: 1,
            maxProperties: 3,
            'x-minProperties-message': 'too few',
            'x-maxProperties-message': 'too many',
          },
          'Schema',
          false,
        ),
      ).toBe(
        'v.pipe(v.looseObject({a:v.string()}),v.check((input)=>Object.keys(input).length>=1,"too few"),v.check((input)=>Object.keys(input).length<=3,"too many"))',
      )
    })
  })

  describe('propertyNames', () => {
    it('emits pattern-based check', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            propertyNames: { pattern: '^[a-z]+$' },
          },
          'Schema',
          false,
        ),
      ).toBe(
        'v.pipe(v.looseObject({a:v.string()}),v.check((input)=>Object.keys(input).every((key)=>new RegExp("^[a-z]+$").test(key))))',
      )
    })

    it('emits enum-based check', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            propertyNames: { enum: ['a', 'b', 'c'] },
          },
          'Schema',
          false,
        ),
      ).toBe(
        'v.pipe(v.looseObject({a:v.string()}),v.check((input)=>Object.keys(input).every((key)=>["a","b","c"].includes(key))))',
      )
    })

    it('uses x-propertyNames-message', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            propertyNames: { pattern: '^[a-z]+$' },
            'x-propertyNames-message': 'lowercase only',
          },
          'Schema',
          false,
        ),
      ).toBe(
        'v.pipe(v.looseObject({a:v.string()}),v.check((input)=>Object.keys(input).every((key)=>new RegExp("^[a-z]+$").test(key)),"lowercase only"))',
      )
    })
  })

  describe('patternProperties', () => {
    it('emits per-pattern v.check', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            patternProperties: { '^x-': { type: 'string' } },
          },
          'Schema',
          false,
        ),
      ).toBe(
        'v.pipe(v.looseObject({a:v.string()}),v.check((input)=>Object.entries(input).every(([key,value])=>!new RegExp("^x-").test(key)||v.safeParse(v.string(),value).success)))',
      )
    })

    it('combines with record (additionalProperties: schema)', () => {
      expect(
        object(
          {
            type: 'object',
            additionalProperties: { type: 'string' },
            patternProperties: { '^id_': { type: 'number' } },
          },
          'Schema',
          false,
        ),
      ).toBe(
        'v.pipe(v.partial(v.looseObject({})),v.check((input)=>Object.entries(input).every(([key,value])=>!new RegExp("^id_").test(key)||v.safeParse(v.number(),value).success)),v.check((input)=>Object.entries(input).every(([key,value])=>[].includes(key)||new RegExp("^id_").test(key)||v.safeParse(v.string(),value).success)))',
      )
    })
  })

  describe('dependentRequired', () => {
    it('emits v.check per key', () => {
      expect(
        object(
          {
            type: 'object',
            properties: {
              card: { type: 'string' },
              billing: { type: 'string' },
            },
            required: ['card'],
            dependentRequired: { card: ['billing'] },
          },
          'Schema',
          false,
        ),
      ).toBe(
        "v.pipe(v.looseObject({card:v.string(),billing:v.optional(v.string())}),v.check((input)=>!('card' in input)||('billing' in input)))",
      )
    })

    it('combines multiple dependent keys with x-dependentRequired-message', () => {
      expect(
        object(
          {
            type: 'object',
            properties: {
              a: { type: 'string' },
              b: { type: 'string' },
              c: { type: 'string' },
            },
            dependentRequired: { a: ['b', 'c'] },
            'x-dependentRequired-message': 'a needs b and c',
          },
          'Schema',
          false,
        ),
      ).toBe(
        "v.pipe(v.partial(v.looseObject({a:v.string(),b:v.string(),c:v.string()})),v.check((input)=>!('a' in input)||('b' in input&&'c' in input),\"a needs b and c\"))",
      )
    })
  })

  describe('x-properties-message', () => {
    it('wraps object with rawCheck that rewrites property-level messages', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            'x-properties-message': 'bad props',
          },
          'Schema',
          false,
        ),
      ).toBe(
        'v.pipe(v.unknown(),v.rawCheck(({dataset,addIssue})=>{if(!dataset.typed)return;const result=v.safeParse(v.object({a:v.string()}),dataset.value);if(!result.success){for(const issue of result.issues){if(issue.path&&issue.path.length>0){addIssue({message:"bad props",path:issue.path})}else{addIssue({message:issue.message})}}}}),v.object({a:v.string()}))',
      )
    })

    it('accepts arrow expression message', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            'x-properties-message': '(issue) => `bad ${issue.path[0].key}`',
          },
          'Schema',
          false,
        ),
      ).toBe(
        'v.pipe(v.unknown(),v.rawCheck(({dataset,addIssue})=>{if(!dataset.typed)return;const result=v.safeParse(v.object({a:v.string()}),dataset.value);if(!result.success){for(const issue of result.issues){if(issue.path&&issue.path.length>0){addIssue({message:((issue) => `bad ${issue.path[0].key}`)(issue),path:issue.path})}else{addIssue({message:issue.message})}}}}),v.object({a:v.string()}))',
      )
    })
  })
})
