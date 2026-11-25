import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import {
  evaluatedProperties,
  evaluatesBeyondOwnKeys,
  isEvaluatedKeyExpression,
  objectEvaluatedKeys,
  propertyNamesEnumCheck,
} from './unevaluated.js'

describe('evaluatedProperties', () => {
  it('reads the properties of every allOf member through its $ref (#405)', () => {
    expect(
      evaluatedProperties(
        {
          allOf: [
            { $ref: '#/$defs/Base' },
            { type: 'object', properties: { doc_count: { type: 'integer' } } },
          ],
          patternProperties: { '^x-': {} },
        },
        { Base: { type: 'object', properties: { meta: { type: 'string' } } } },
      ),
    ).toStrictEqual({ names: ['meta', 'doc_count'], patterns: ['^x-'] })
  })

  it('stops at a $ref cycle', () => {
    expect(
      evaluatedProperties(
        { $ref: '#/$defs/A' },
        { A: { properties: { a: {} }, allOf: [{ $ref: '#/$defs/A' }] } },
      ),
    ).toStrictEqual({ names: ['a'], patterns: [] })
  })

  it('is undefined when every key is evaluated or the $ref is unknown', () => {
    expect(evaluatedProperties({ allOf: [{ additionalProperties: true }] }, {})).toBeUndefined()
    expect(evaluatedProperties({ allOf: [{ $ref: '#/$defs/Missing' }] }, {})).toBeUndefined()
  })
})

describe('isEvaluatedKeyExpression', () => {
  it('tests the names, then each pattern', () => {
    expect(isEvaluatedKeyExpression({ names: ['a'], patterns: ['^x-'] }, 'k')).toBe(
      '["a"].includes(k)||new RegExp("^x-").test(k)',
    )
  })

  it('leaves out the lookup when no name is evaluated, as `[].includes(k)` does not type-check (#60)', () => {
    expect(isEvaluatedKeyExpression({ names: [], patterns: ['^x-'] }, 'k')).toBe(
      'new RegExp("^x-").test(k)',
    )
    expect(isEvaluatedKeyExpression({ names: [], patterns: [] }, 'k')).toBeUndefined()
  })
})

describe('propertyNamesEnumCheck', () => {
  it.each<[readonly unknown[], string]>([
    [['a', 'b'], 'Object.keys(input).every((key)=>["a","b"].includes(key))'],
    [['a', 1, null], 'Object.keys(input).every((key)=>["a"].includes(key))'],
    [[], 'Object.keys(input).length===0'],
    [[1, true], 'Object.keys(input).length===0'],
  ])('%j → %s', (values, expected) => {
    expect(propertyNamesEnumCheck(values, 'input')).toBe(expected)
  })
})

describe('objectEvaluatedKeys', () => {
  const branches = {
    type: 'object',
    properties: { a: {} },
    patternProperties: { '^x-': {} },
    dependentSchemas: { a: { properties: { b: {} } } },
    if: { properties: { a: { const: 1 } } },
    // oxlint-disable-next-line unicorn/no-thenable -- the JSON Schema keyword, not a promise
    then: { properties: { c: {} } },
    else: { properties: { d: {} } },
  } satisfies JSONSchema

  it('reads the then, else and dependentSchemas keys for unevaluatedProperties', () => {
    const evaluated = objectEvaluatedKeys({ ...branches, unevaluatedProperties: false }, undefined)
    expect(evaluated).toStrictEqual({ names: ['a', 'c', 'd', 'b'], patterns: ['^x-'] })
    expect(evaluated && evaluatesBeyondOwnKeys(branches, evaluated)).toBe(true)
  })

  it('reads only the own keys for additionalProperties', () => {
    const evaluated = objectEvaluatedKeys({ ...branches, additionalProperties: false }, undefined)
    expect(evaluated).toStrictEqual({ names: ['a'], patterns: ['^x-'] })
    expect(evaluated && evaluatesBeyondOwnKeys(branches, evaluated)).toBe(false)
  })

  it('is undefined when a branch $ref cannot be read, as every key then counts', () => {
    expect(
      objectEvaluatedKeys(
        {
          type: 'object',
          // oxlint-disable-next-line unicorn/no-thenable -- the JSON Schema keyword, not a promise
          then: { $ref: '#/$defs/Missing' },
          unevaluatedProperties: false,
        },
        {},
      ),
    ).toBeUndefined()
  })
})
