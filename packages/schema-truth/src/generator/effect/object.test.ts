import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { object } from './object.js'

describe('object', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'object' }, 'Schema.Struct({})'],
    [
      { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
      'Schema.Struct({foo:Schema.String})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
        required: ['foo'],
      },
      'Schema.Struct({foo:Schema.String,bar:Schema.optionalKey(Schema.Number)})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' } },
      },
      'Schema.Struct({foo:Schema.optionalKey(Schema.String)})',
    ],
    [
      {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      'Schema.Record(Schema.String,Schema.String)',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input, 'Schema', false)).toBe(expected)
  })

  describe('minProperties / maxProperties', () => {
    it('emits .pipe with Schema.filter for minProperties', () => {
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
      ).toBe(
        'Schema.StructWithRest(Schema.Struct({a:Schema.String}),[Schema.Record(Schema.String,Schema.Unknown)]).check(Schema.makeFilter((input)=>Object.keys(input).length>=2))',
      )
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
        'Schema.StructWithRest(Schema.Struct({a:Schema.String}),[Schema.Record(Schema.String,Schema.Unknown)]).check(Schema.makeFilter((input)=>Object.keys(input).length>=1,{message:"too few"}),Schema.makeFilter((input)=>Object.keys(input).length<=3,{message:"too many"}))',
      )
    })
  })

  describe('propertyNames', () => {
    it('emits pattern-based filter', () => {
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
        'Schema.StructWithRest(Schema.Struct({a:Schema.String}),[Schema.Record(Schema.String,Schema.Unknown)]).check(Schema.makeFilter((input)=>Object.keys(input).every((key)=>new RegExp("^[a-z]+$").test(key))))',
      )
    })

    it('emits enum-based filter', () => {
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
        'Schema.StructWithRest(Schema.Struct({a:Schema.String}),[Schema.Record(Schema.String,Schema.Unknown)]).check(Schema.makeFilter((input)=>Object.keys(input).every((key)=>["a","b","c"].includes(key))))',
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
        'Schema.StructWithRest(Schema.Struct({a:Schema.String}),[Schema.Record(Schema.String,Schema.Unknown)]).check(Schema.makeFilter((input)=>Object.keys(input).every((key)=>new RegExp("^[a-z]+$").test(key)),{message:"lowercase only"}))',
      )
    })
  })

  describe('patternProperties', () => {
    it('emits per-pattern Schema.filter', () => {
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
        'Schema.StructWithRest(Schema.Struct({a:Schema.String}),[Schema.Record(Schema.String,Schema.Unknown)]).check(Schema.makeFilter((input)=>Object.entries(input).every(([key,value])=>!new RegExp("^x-").test(key)||Schema.is(Schema.toEncoded(Schema.String))(value))))',
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
        'Schema.StructWithRest(Schema.Struct({}),[Schema.Record(Schema.String,Schema.Unknown)]).check(Schema.makeFilter((input)=>Object.entries(input).every(([key,value])=>!new RegExp("^id_").test(key)||Schema.is(Schema.toEncoded(Schema.Number))(value))),Schema.makeFilter((input)=>Object.entries(input).every(([key,value])=>[].includes(key)||new RegExp("^id_").test(key)||Schema.is(Schema.toEncoded(Schema.String))(value))))',
      )
    })
  })

  describe('dependentRequired', () => {
    it('emits Schema.filter per key', () => {
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
        "Schema.StructWithRest(Schema.Struct({card:Schema.String,billing:Schema.optionalKey(Schema.String)}),[Schema.Record(Schema.String,Schema.Unknown)]).check(Schema.makeFilter((input)=>!('card' in input)||('billing' in input)))",
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
        "Schema.StructWithRest(Schema.Struct({a:Schema.optionalKey(Schema.String),b:Schema.optionalKey(Schema.String),c:Schema.optionalKey(Schema.String)}),[Schema.Record(Schema.String,Schema.Unknown)]).check(Schema.makeFilter((input)=>!('a' in input)||('b' in input&&'c' in input),{message:\"a needs b and c\"}))",
      )
    })
  })

  describe('x-properties-message', () => {
    it('wraps struct with transformOrFail that rewrites property-level messages', () => {
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
        'Schema.Unknown.check(Schema.makeFilter((input)=>Schema.is(Schema.Struct({a:Schema.String}))(input),{message:"bad props"})).pipe(Schema.decodeTo(Schema.Struct({a:Schema.String})))',
      )
    })
  })
})
