import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { object } from './object.js'

describe('object', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'object' }, 'type({})'],
    [
      { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
      'type({foo:"string"})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
        required: ['foo'],
      },
      'type({foo:"string","bar?":"number"})',
    ],
    [
      {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      'type({"[string]":"string"})',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input, 'Schema', false)).toBe(expected)
  })

  describe('minProperties / maxProperties', () => {
    it('emits .narrow for minProperties', () => {
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
      ).toBe('type({a:"string"}).narrow((data) => Object.keys(data).length >= 2)')
    })

    it('emits both with x-minimum-message / x-maximum-message via ctx.mustBe', () => {
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
        'type({a:"string"}).narrow((data, ctx) => Object.keys(data).length >= 1 || ctx.mustBe("too few")).narrow((data, ctx) => Object.keys(data).length <= 3 || ctx.mustBe("too many"))',
      )
    })
  })

  describe('propertyNames', () => {
    it('emits pattern-based narrow', () => {
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
        'type({a:"string"}).narrow((data) => Object.keys(data).every((key) => new RegExp("^[a-z]+$").test(key)))',
      )
    })

    it('emits enum-based narrow', () => {
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
        'type({a:"string"}).narrow((data) => Object.keys(data).every((key) => ["a","b","c"].includes(key)))',
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
        'type({a:"string"}).narrow((data, ctx) => Object.keys(data).every((key) => new RegExp("^[a-z]+$").test(key)) || ctx.mustBe("lowercase only"))',
      )
    })
  })

  describe('patternProperties', () => {
    it('emits per-pattern narrow with .allows()', () => {
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
        'type({a:"string"}).narrow((data) => Object.entries(data).every(([key, value]) => !new RegExp("^x-").test(key) || type("string").allows(value)))',
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
        'type({}).narrow((data) => Object.entries(data).every(([key, value]) => !new RegExp("^id_").test(key) || type("number").allows(value))).narrow((data) => Object.entries(data).every(([key, value]) => [].includes(key)||new RegExp("^id_").test(key) || type("string").allows(value)))',
      )
    })
  })

  describe('dependentRequired', () => {
    it('emits narrow per key', () => {
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
        'type({card:"string","billing?":"string"}).narrow((data) => !(\'card\' in data) || (\'billing\' in data))',
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
        'type({"a?":"string","b?":"string","c?":"string"}).narrow((data, ctx) => !(\'a\' in data) || (\'b\' in data && \'c\' in data) || ctx.mustBe("a needs b and c"))',
      )
    })
  })

  describe('x-properties-message', () => {
    it('attaches .describe to the object type', () => {
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
      ).toBe('type({a:"string"}).describe("bad props")')
    })

    it('composes with narrows from minProperties', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            minProperties: 1,
            'x-properties-message': 'bad props',
          },
          'Schema',
          false,
        ),
      ).toBe(
        'type({a:"string"}).narrow((data) => Object.keys(data).length >= 1).describe("bad props")',
      )
    })
  })
})

describe('object dependent / unevaluated / conditional keywords', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      {
        type: 'object',
        properties: { a: { type: 'string' }, b: { type: 'string' } },
        dependentRequired: { a: ['b'] },
      },
      `type({"a?":"string","b?":"string"}).narrow((data) => !('a' in data) || ('b' in data))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' }, b: { type: 'string' } },
        dependentRequired: { a: ['b'] },
        'x-dependentRequired-message': 'need b',
      },
      `type({"a?":"string","b?":"string"}).narrow((data, ctx) => !('a' in data) || ('b' in data) || ctx.mustBe("need b"))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        dependentSchemas: { a: { properties: { b: { type: 'number' } }, required: ['b'] } },
      },
      `type({"a?":"string"}).narrow((data) => !('a' in data) || type({b:"number"}).allows(data))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        additionalProperties: false,
        'x-additionalProperties-message': 'no extras',
      },
      'type({"a?":"string","+":"reject"}).narrow((data, ctx) => Object.keys(data).every((key) => ["a"].includes(key)) || ctx.mustBe("no extras"))',
    ],
    [
      { type: 'object', properties: { a: { type: 'string' } }, additionalProperties: false },
      'type({"a?":"string","+":"reject"})',
    ],
    [
      { type: 'object', properties: { a: { type: 'string' } }, unevaluatedProperties: false },
      'type({"a?":"string"}).narrow((data) => Object.keys(data).every((key) => ["a"].includes(key)))',
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        unevaluatedProperties: { type: 'string' },
      },
      'type({"a?":"string"}).narrow((data) => Object.entries(data).every(([key, value]) => ["a"].includes(key) || type("string").allows(value)))',
    ],
    [
      { type: 'object', properties: { a: { type: 'string' } }, unevaluatedProperties: true },
      'type({"a?":"string"})',
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        if: { properties: { a: { const: 'x' } } },
        // eslint-disable-next-line unicorn/no-thenable -- JSON Schema `then` keyword, not a Promise thenable
        then: { required: ['a'] },
      },
      `type({"a?":"string"}).narrow((data) => !type({"a?":"'x'"}).allows(data) || type("unknown").allows(data))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        if: { properties: { a: { const: 'x' } } },
        else: { required: ['a'] },
      },
      `type({"a?":"string"}).narrow((data) => type({"a?":"'x'"}).allows(data) || type("unknown").allows(data))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        if: { properties: { a: { const: 'x' } } },
        // eslint-disable-next-line unicorn/no-thenable -- JSON Schema `then` keyword, not a Promise thenable
        then: { required: ['a'] },
        else: { properties: { a: { type: 'string' } } },
        'x-if-message': 'iff',
      },
      `type({"a?":"string"}).narrow((data, ctx) => !type({"a?":"'x'"}).allows(data) || type("unknown").allows(data) || ctx.mustBe("iff")).narrow((data, ctx) => type({"a?":"'x'"}).allows(data) || type({"a?":"string"}).allows(data) || ctx.mustBe("iff"))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        if: { properties: { a: { const: 'x' } } },
      },
      'type({"a?":"string"})',
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        propertyNames: { pattern: '^[a-z]+$' },
      },
      'type({"a?":"string"}).narrow((data) => Object.keys(data).every((key) => new RegExp("^[a-z]+$").test(key)))',
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        propertyNames: { enum: ['a', 'b'] },
      },
      'type({"a?":"string"}).narrow((data) => Object.keys(data).every((key) => ["a","b"].includes(key)))',
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        patternProperties: { '^x-': { type: 'number' } },
      },
      'type({"a?":"string"}).narrow((data) => Object.entries(data).every(([key, value]) => !new RegExp("^x-").test(key) || type("number").allows(value)))',
    ],
    [
      {
        type: 'object',
        additionalProperties: { type: 'string' },
        propertyNames: { pattern: '^x' },
      },
      'type({"[string]":"string"}).narrow((data) => Object.keys(data).every((key) => new RegExp("^x").test(key)))',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input, 'Schema', false)).toBe(expected)
  })

  it('wraps with .describe for x-properties-message', () => {
    expect(
      object(
        {
          type: 'object',
          properties: { a: { type: 'string' } },
          required: ['a'],
          'x-properties-message': 'P',
        },
        'Schema',
        false,
      ),
    ).toBe('type({a:"string"}).describe("P")')
  })

  it('describes a bare literal with an "@" tuple for x-properties-message inside a scope', () => {
    expect(
      object(
        {
          type: 'object',
          properties: { a: { type: 'string' } },
          required: ['a'],
          'x-properties-message': 'P',
        },
        'Schema',
        true,
      ),
    ).toBe('[{a:"string"},"@","P"]')
  })
})
