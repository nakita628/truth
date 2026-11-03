import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { object } from './object.js'

describe('object', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'object' }, 'Type.Object({})'],
    [
      { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
      'Type.Object({foo:Type.String()})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
        required: ['foo'],
      },
      'Type.Object({foo:Type.String(),bar:Type.Optional(Type.Number())})',
    ],
    [
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        required: ['test'],
        additionalProperties: false,
      },
      'Type.Object({test:Type.String()},{additionalProperties:false})',
    ],
    [
      {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      'Type.Record(Type.String(),Type.String())',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input, 'Schema', false)).toBe(expected)
  })

  describe('minProperties / maxProperties', () => {
    it('emits options bag entries', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            minProperties: 2,
            maxProperties: 5,
          },
          'Schema',
          false,
        ),
      ).toBe('Type.Object({a:Type.String()},{minProperties:2,maxProperties:5})')
    })

    it('combines with additionalProperties:false', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            additionalProperties: false,
            minProperties: 1,
          },
          'Schema',
          false,
        ),
      ).toBe('Type.Object({a:Type.String()},{additionalProperties:false,minProperties:1})')
    })
  })

  describe('propertyNames', () => {
    it('emits propertyNames as TypeBox sub-schema (pattern)', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            propertyNames: { type: 'string', pattern: '^[a-z]+$' },
          },
          'Schema',
          false,
        ),
      ).toBe('Type.Object({a:Type.String()},{propertyNames:Type.String({pattern:"^[a-z]+$"})})')
    })
  })

  describe('patternProperties', () => {
    it('emits patternProperties as TypeBox sub-schema map', () => {
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
      ).toBe('Type.Object({a:Type.String()},{patternProperties:{"^x-":Type.String()}})')
    })

    it('keeps additionalProperties for the keys no pattern matches', () => {
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
        'Type.Object({},{additionalProperties:Type.String(),patternProperties:{"^id_":Type.Number()}})',
      )
    })
  })

  describe('dependentRequired', () => {
    it('emits dependentRequired option', () => {
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
        'Type.Object({card:Type.String(),billing:Type.Optional(Type.String())},{dependentRequired:{"card":["billing"]}})',
      )
    })
  })

  describe('x-properties-message', () => {
    it('aggregates into ajv-errors errorMessage.properties', () => {
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
      ).toBe('Type.Object({a:Type.String()},{errorMessage:{properties:"bad props"}})')
    })

    it('coexists with other ajv-errors keyword messages', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            minProperties: 1,
            'x-properties-message': 'bad props',
            'x-minProperties-message': 'too few',
          },
          'Schema',
          false,
        ),
      ).toBe(
        'Type.Object({a:Type.String()},{minProperties:1,errorMessage:{minProperties:"too few",properties:"bad props"}})',
      )
    })
  })
})
