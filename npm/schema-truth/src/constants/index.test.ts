import { describe, expect, it } from 'vite-plus/test'

import {
  ALL_CODE_EXTENSION_KEYS,
  ANCHOR_REF_PATTERN,
  ARROW_FUNCTION_PATTERN,
  DEFINITION_POINTER_PATTERN,
  DEFINITION_REF_PREFIXES,
  IDENTIFIER_PATTERN,
  JSON_SCHEMA_TYPES,
  NUMBER_FORMATS,
  OPENAPI_COMPONENT_SUFFIX_MAP,
  STRING_FORMATS,
  UNICODE_ESCAPE_PATTERN,
} from './index.js'

describe('constants', () => {
  it('lists the seven JSON Schema types and the date extension', () => {
    expect(JSON_SCHEMA_TYPES).toStrictEqual([
      'string',
      'number',
      'integer',
      'boolean',
      'array',
      'object',
      'null',
      'date',
    ])
  })

  it('keeps string and number formats disjoint and free of duplicates', () => {
    const strings = new Set<string>(STRING_FORMATS)
    const numbers = new Set<string>(NUMBER_FORMATS)
    expect(strings.size).toBe(STRING_FORMATS.length)
    expect(numbers.size).toBe(NUMBER_FORMATS.length)
    expect([...strings].filter((format) => numbers.has(format))).toStrictEqual([])
  })

  it('names every format a generator switches on', () => {
    for (const format of ['email', 'uuid', 'date-time', 'hash', 'mac', 'jwt', 'int64', 'bigint']) {
      expect([...STRING_FORMATS, ...NUMBER_FORMATS]).toContain(format)
    }
  })

  it('sorts the code-extension keys and removes the shared ones once', () => {
    const pairs = ALL_CODE_EXTENSION_KEYS.slice(1).map((key, i) => [
      ALL_CODE_EXTENSION_KEYS[i],
      key,
    ])
    expect(pairs.every(([before, after]) => before !== undefined && before < after)).toBe(true)
    expect(new Set(ALL_CODE_EXTENSION_KEYS).size).toBe(ALL_CODE_EXTENSION_KEYS.length)
  })

  it('maps every definition prefix to the Schema suffix', () => {
    const schemas = OPENAPI_COMPONENT_SUFFIX_MAP.find(({ prefix }) => prefix.endsWith('schemas/'))
    expect(schemas?.suffix).toBe('Schema')
    expect(DEFINITION_REF_PREFIXES).toContain(schemas?.prefix)
  })

  it.concurrent.each<[string, boolean]>([
    ['name', true],
    ['$ref', true],
    ['_private', true],
    ['first-name', false],
    ['1st', false],
    ['', false],
  ])('IDENTIFIER_PATTERN.test(%j) → %s', (key, expected) => {
    expect(IDENTIFIER_PATTERN.test(key)).toBe(expected)
  })

  it.concurrent.each<[string, boolean]>([
    ['(issue) => issue.input', true],
    ['  (a, b) => a', true],
    ['issue => issue.input', false],
    ['Required', false],
  ])('ARROW_FUNCTION_PATTERN.test(%j) → %s', (message, expected) => {
    expect(ARROW_FUNCTION_PATTERN.test(message)).toBe(expected)
  })

  it.concurrent.each<[string, boolean]>([
    ['^\\p{L}+$', true],
    ['\\P{N}', true],
    ['\\u{1F600}', true],
    ['^[a-z]+$', false],
    ['\\u0041', false],
  ])('UNICODE_ESCAPE_PATTERN.test(%j) → %s', (pattern, expected) => {
    expect(UNICODE_ESCAPE_PATTERN.test(pattern)).toBe(expected)
  })

  it.concurrent.each<[string, string | undefined]>([
    ['#/$defs/User', 'User'],
    ['#/definitions/User', 'User'],
    ['#/$defs/User/properties/name', undefined],
    ['#/components/schemas/User', undefined],
    ['#', undefined],
  ])('DEFINITION_POINTER_PATTERN on %j names %j', (ref, expected) => {
    expect(DEFINITION_POINTER_PATTERN.exec(ref)?.groups?.name).toBe(expected)
  })

  it.concurrent.each<[string, string | undefined]>([
    ['#User', 'User'],
    ['#/$defs/User', undefined],
    ['#', undefined],
  ])('ANCHOR_REF_PATTERN on %j names %j', (ref, expected) => {
    expect(ANCHOR_REF_PATTERN.exec(ref)?.groups?.name).toBe(expected)
  })
})
