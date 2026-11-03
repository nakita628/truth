import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import {
  canBeNull,
  canBeString,
  hasCombinator,
  hasNumericKeyword,
  hasStringKeyword,
  hasConditional,
  hasFixedItemCount,
  hasFixedLength,
  hasType,
  isArktypeDefinition,
  isArrowExpression,
  isComposite,
  isConstOnlyMember,
  isDeepLocalPointer,
  isDefaultOnlyMember,
  isDefinitionKeyword,
  isJSONSchemaType,
  isNullable,
  isNullTypeMember,
  isObjectPrototypeProperty,
  isPlainObject,
  isPrimitive,
  isQuoted,
  isRecord,
  isRootRef,
  isSchemaList,
  isSchemaObject,
  isShapelessMember,
  isStringWireLocation,
  isValidIdentifier,
} from './index.js'

describe('guard', () => {
  describe('values', () => {
    it.concurrent.each<[unknown, boolean]>([
      [{}, true],
      [[], true],
      [null, false],
      ['x', false],
      [1, false],
    ])('isRecord(%j) → %s', (value, expected) => {
      expect(isRecord(value)).toBe(expected)
    })

    it.concurrent.each<[unknown, boolean]>([
      [{}, true],
      [[], false],
      [null, false],
    ])('isPlainObject(%j) → %s', (value, expected) => {
      expect(isPlainObject(value)).toBe(expected)
    })

    it.concurrent.each<[unknown, boolean]>([
      ['a', true],
      [1, true],
      [true, true],
      [null, true],
      [[], false],
      [{}, false],
      [undefined, false],
    ])('isPrimitive(%j) → %s', (value, expected) => {
      expect(isPrimitive(value)).toBe(expected)
    })

    it.concurrent.each<[unknown, boolean]>([
      [[], true],
      [{}, true],
      [null, false],
      ['a', false],
    ])('isComposite(%j) → %s', (value, expected) => {
      expect(isComposite(value)).toBe(expected)
    })
  })

  describe('names and messages', () => {
    it.concurrent.each<[string, boolean]>([
      ['user', true],
      ['$ref', true],
      ['user-name', false],
      ['123', false],
    ])('isValidIdentifier(%j) → %s', (name, expected) => {
      expect(isValidIdentifier(name)).toBe(expected)
    })

    it.concurrent.each<[string, boolean]>([
      ['(issue) => `Expected ${issue.input}`', true],
      ['Must be valid', false],
    ])('isArrowExpression(%j) → %s', (source, expected) => {
      expect(isArrowExpression(source)).toBe(expected)
    })

    it.concurrent.each<[unknown, boolean]>([
      ['string', true],
      ['date', true],
      ['float', false],
      [1, false],
    ])('isJSONSchemaType(%j) → %s', (value, expected) => {
      expect(isJSONSchemaType(value)).toBe(expected)
    })

    it.concurrent.each<[string, boolean]>([
      ['$defs', true],
      ['definitions', true],
      ['properties', false],
    ])('isDefinitionKeyword(%j) → %s', (key, expected) => {
      expect(isDefinitionKeyword(key)).toBe(expected)
    })

    it.concurrent.each<[Parameters<typeof isStringWireLocation>[0], boolean]>([
      ['query', true],
      ['path', true],
      ['header', true],
      ['cookie', true],
      ['formData', true],
      [undefined, false],
    ])('isStringWireLocation(%j) → %s', (location, expected) => {
      expect(isStringWireLocation(location)).toBe(expected)
    })
  })

  describe('references', () => {
    it.concurrent.each<[string | undefined, boolean]>([
      ['#', true],
      ['', true],
      ['#/$defs/A', false],
      [undefined, false],
    ])('isRootRef(%j) → %s', (ref, expected) => {
      expect(isRootRef(ref)).toBe(expected)
    })

    it.concurrent.each<[string, boolean]>([
      ['#/components/schemas/User', false],
      ['#/components/schemas/User/properties/x', true],
      ['#/$defs/User/items', true],
      ['#/definitions/User', false],
      ['other.json#/definitions/User/x', false],
    ])('isDeepLocalPointer(%j) → %s', (ref, expected) => {
      expect(isDeepLocalPointer(ref)).toBe(expected)
    })
  })

  describe('schema shapes', () => {
    it.concurrent.each<[JSONSchema['items'], boolean, boolean]>([
      [{ type: 'string' }, true, false],
      [[{ type: 'string' }], false, true],
      [true, false, false],
      [false, false, false],
      [undefined, false, false],
    ])('isSchemaObject / isSchemaList on %j', (items, object, list) => {
      expect(isSchemaObject(items)).toBe(object)
      expect(isSchemaList(items)).toBe(list)
    })

    it.concurrent.each<[JSONSchema, boolean]>([
      [{ type: 'string', nullable: true }, true],
      [{ type: ['string', 'null'] }, true],
      [{ type: 'null' }, true],
      [{ type: 'string' }, false],
      [{}, false],
    ])('isNullable(%j) → %s', (schema, expected) => {
      expect(isNullable(schema)).toBe(expected)
    })

    it.concurrent.each<[JSONSchema, boolean]>([
      [{ type: 'array' }, true],
      [{ type: ['array', 'null'] }, true],
      [{ type: 'object' }, false],
      [{}, false],
    ])("hasType(%j, 'array') → %s", (schema, expected) => {
      expect(hasType(schema, 'array')).toBe(expected)
    })

    it.concurrent.each<[JSONSchema, boolean]>([
      [{ oneOf: [] }, true],
      [{ anyOf: [] }, true],
      [{ allOf: [] }, true],
      [{ not: {} }, true],
      [{ type: 'object' }, false],
    ])('hasCombinator(%j) → %s', (schema, expected) => {
      expect(hasCombinator(schema)).toBe(expected)
    })

    it.concurrent.each<[JSONSchema, boolean]>([
      [{ if: {} }, true],
      // oxlint-disable-next-line unicorn/no-thenable -- `then` is the keyword under test
      [{ then: {} }, true],
      [{ else: {} }, true],
      [{ type: 'object' }, false],
    ])('hasConditional(%j) → %s', (schema, expected) => {
      expect(hasConditional(schema)).toBe(expected)
    })

    it.concurrent.each<[JSONSchema, boolean]>([
      [{ minLength: 3, maxLength: 3 }, true],
      [{ minLength: 3, maxLength: 4 }, false],
      [{ minLength: 3 }, false],
    ])('hasFixedLength(%j) → %s', (schema, expected) => {
      expect(hasFixedLength(schema)).toBe(expected)
    })

    it.concurrent.each<[JSONSchema, boolean]>([
      [{ minItems: 2, maxItems: 2 }, true],
      [{ minItems: 2, maxItems: 3 }, false],
      [{ maxItems: 2 }, false],
    ])('hasFixedItemCount(%j) → %s', (schema, expected) => {
      expect(hasFixedItemCount(schema)).toBe(expected)
    })
  })

  describe('allOf members', () => {
    it('tells a null member, a default-only member and a const-only member apart', () => {
      expect(isNullTypeMember({ type: 'null' })).toBe(true)
      expect(isNullTypeMember({ nullable: true })).toBe(true)
      expect(isNullTypeMember({ nullable: true, type: 'string' })).toBe(false)
      expect(isDefaultOnlyMember({ default: 1 })).toBe(true)
      expect(isDefaultOnlyMember({ default: 1, type: 'number' })).toBe(false)
      expect(isConstOnlyMember({ const: 'a' })).toBe(true)
      expect(isConstOnlyMember({ const: 'a', type: 'string' })).toBe(false)
    })

    it.concurrent.each<[JSONSchema, boolean]>([
      [{ type: 'null' }, true],
      [{ default: null }, true],
      [{ const: 1 }, true],
      [{ type: 'string' }, false],
      [{ $ref: '#/$defs/A' }, false],
    ])('isShapelessMember(%j) → %s', (schema, expected) => {
      expect(isShapelessMember(schema)).toBe(expected)
    })
  })

  describe('emitted source', () => {
    it.concurrent.each<[string, boolean, boolean]>([
      ['"string"', true, true],
      ['{name:"string"}', false, true],
      ['["string","|","null"]', false, true],
      ['type("string")', false, false],
    ])('isQuoted / isArktypeDefinition on %s', (source, quoted, definition) => {
      expect(isQuoted(source)).toBe(quoted)
      expect(isArktypeDefinition(source)).toBe(definition)
    })
  })

  describe('wire', () => {
    it.concurrent.each<[JSONSchema, boolean]>([
      [{ type: 'integer' }, false],
      [{ type: ['integer', 'null'] }, true],
      [{ type: 'integer', nullable: true }, true],
      [{ enum: [1, null] }, true],
      [{ const: null }, true],
      [{ oneOf: [{ type: 'integer' }, { type: 'null' }] }, true],
      [{ anyOf: [{ type: 'integer' }, { type: 'boolean' }] }, false],
    ])('canBeNull(%o) → %s', (schema, expected) => {
      expect(canBeNull(schema)).toBe(expected)
    })

    it.concurrent.each<[JSONSchema, boolean]>([
      [{ type: 'string' }, true],
      [{ type: ['integer', 'null'] }, false],
      [{ enum: [1, 'a'] }, true],
      [{ enum: [1, null] }, false],
      [{ const: 'a' }, true],
      [{ oneOf: [{ type: 'integer' }, { type: 'string' }] }, true],
      [{ oneOf: [{ type: 'integer' }, { type: 'null' }] }, false],
      [{}, true],
      [{ $ref: '#/$defs/A' }, false],
    ])('canBeString(%o) → %s', (schema, expected) => {
      expect(canBeString(schema)).toBe(expected)
    })

    it.concurrent.each<[JSONSchema, boolean, boolean]>([
      [{ minimum: 1 }, true, false],
      [{ multipleOf: 2 }, true, false],
      [{ maxLength: 2 }, false, true],
      [{ pattern: '^a' }, false, true],
      [{ description: 'x' }, false, false],
    ])('hasNumericKeyword / hasStringKeyword(%o) → %s / %s', (schema, numeric, text) => {
      expect(hasNumericKeyword(schema)).toBe(numeric)
      expect(hasStringKeyword(schema)).toBe(text)
    })

    it.concurrent.each<[string, boolean]>([
      ['constructor', true],
      ['toString', true],
      ['__proto__', true],
      ['hasOwnProperty', true],
      ['name', false],
      ['prototype', false],
    ])('isObjectPrototypeProperty(%j) → %s', (name, expected) => {
      expect(isObjectPrototypeProperty(name)).toBe(expected)
    })
  })
})
