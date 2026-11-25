import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import {
  evaluatedProperties,
  hasBranchKeys,
  isEvaluatedKeyExpression,
  isEvaluatedObjectKeyExpression,
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
    if: { properties: { flag: { const: true } } },
    // oxlint-disable-next-line unicorn/no-thenable -- the JSON Schema keyword, not a promise
    then: { properties: { c: {} } },
    else: { properties: { d: {} } },
  } satisfies JSONSchema

  it('reads each branch for unevaluatedProperties, if keys with then', () => {
    const keys = objectEvaluatedKeys({ ...branches, unevaluatedProperties: false }, undefined)
    expect(keys).toStrictEqual({
      own: { names: ['a'], patterns: ['^x-'] },
      conditional: {
        passed: { names: ['flag', 'c'], patterns: [] },
        failed: { names: ['d'], patterns: [] },
      },
      dependent: [['a', { names: ['b'], patterns: [] }]],
    })
    expect(hasBranchKeys(keys)).toBe(true)
    expect(isEvaluatedObjectKeyExpression(keys, 'key', 'input', () => 'IF')).toBe(
      '["a"].includes(key)||new RegExp("^x-").test(key)||(IF&&(["flag","c"].includes(key)))||(!IF&&(["d"].includes(key)))||("a" in input&&(["b"].includes(key)))',
    )
  })

  it('reads only the own keys for additionalProperties', () => {
    const keys = objectEvaluatedKeys({ ...branches, additionalProperties: false }, undefined)
    expect(keys).toStrictEqual({ own: { names: ['a'], patterns: ['^x-'] }, dependent: [] })
    expect(hasBranchKeys(keys)).toBe(false)
  })

  it('ignores then and else without an if', () => {
    const keys = objectEvaluatedKeys(
      {
        type: 'object',
        // oxlint-disable-next-line unicorn/no-thenable -- the JSON Schema keyword, not a promise
        then: { properties: { b: {} } },
        unevaluatedProperties: false,
      },
      undefined,
    )
    expect(hasBranchKeys(keys)).toBe(false)
    expect(isEvaluatedObjectKeyExpression(keys, 'key', 'input', () => 'IF')).toBeUndefined()
  })

  it('allows every key where a branch whose keys cannot be told applies', () => {
    const keys = objectEvaluatedKeys(
      {
        type: 'object',
        dependentSchemas: { a: { $ref: '#/$defs/Missing' } },
        unevaluatedProperties: false,
      },
      {},
    )
    expect(isEvaluatedObjectKeyExpression(keys, 'key', 'input', () => 'IF')).toBe('"a" in input')
  })
})
