import { describe, expect, it } from 'vite-plus/test'

import { arktype } from '../generator/arktype/arktype.js'
import { effect } from '../generator/effect/effect.js'
import { valibot } from '../generator/valibot/valibot.js'
import { zod } from '../generator/zod/zod.js'
import type { JSONSchema } from '../parser/index.js'
import {
  evaluatedProperties,
  hasBranchKeys,
  isEvaluatedKeyExpression,
  isEvaluatedObjectKeyExpression,
  objectEvaluatedKeys,
  propertyNamesEnumCheck,
  evaluatedObjectKeysCheck,
  ownKeyCheck,
  propertyNamesKeyCheck,
  requiredKeysCheck,
  withoutShadowedUnevaluated,
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

describe('propertyNamesKeyCheck (#90)', () => {
  it.each<[JSONSchema | boolean | undefined, string | undefined]>([
    [undefined, undefined],
    [true, undefined],
    [{}, undefined],
    [{ pattern: '' }, undefined],
    [false, 'Object.keys(input).length===0'],
    [{ const: 'a' }, 'Object.keys(input).every((key)=>["a"].includes(key))'],
    [{ const: 1 }, 'Object.keys(input).length===0'],
    [
      { pattern: '^[a-z]+$' },
      '((re)=>Object.keys(input).every((key)=>re.test(key)))(new RegExp("^[a-z]+$"))',
    ],
    [
      { pattern: '^\\p{L}+$' },
      '((re)=>Object.keys(input).every((key)=>re.test(key)))(new RegExp("^\\\\p{L}+$","u"))',
    ],
    [
      { pattern: '\\\\/' },
      '((re)=>Object.keys(input).every((key)=>re.test(key)))(new RegExp("\\\\\\\\/"))',
    ],
    [
      { pattern: 'a\nb' },
      '((re)=>Object.keys(input).every((key)=>re.test(key)))(new RegExp("a\\nb"))',
    ],
    [
      { minLength: 1, maxLength: 3 },
      'Object.keys(input).every((key)=>Array.from(key).length>=1)&&Object.keys(input).every((key)=>Array.from(key).length<=3)',
    ],
    [
      { pattern: '^[a-z]+$', enum: ['a', 'B'] },
      '((re)=>Object.keys(input).every((key)=>re.test(key)))(new RegExp("^[a-z]+$"))&&Object.keys(input).every((key)=>["a","B"].includes(key))',
    ],
    [
      { enum: ['a', 'b'], const: 'a' },
      'Object.keys(input).every((key)=>["a","b"].includes(key))&&Object.keys(input).every((key)=>["a"].includes(key))',
    ],
  ])('propertyNamesKeyCheck(%o) → %s', (propertyNames, expected) => {
    expect(propertyNamesKeyCheck(propertyNames, 'input')).toBe(expected)
  })

  it.each([
    '\\\\/',
    'a\nb',
    'a\u2028b',
    '^\\p{L}+$',
    '^\\x{1F600}$',
    '^\\\\p{x}$',
    "^\\p{L}[\\w\\s\\']*$",
  ])('emits a check that parses and runs for the pattern %j', (pattern) => {
    const check = propertyNamesKeyCheck({ pattern }, 'input')
    // oxlint-disable-next-line eslint/no-new-func, typescript/no-implied-eval -- the emitted code is what is under test
    expect(() => new Function('input', `return ${check}`)({})).not.toThrow()
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
      '["a"].includes(key)||new RegExp("^x-").test(key)||(IF&&(["flag","c"].includes(key)))||(!(IF)&&(["d"].includes(key)))||(Object.hasOwn(input,"a")&&(["b"].includes(key)))',
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

  it('leaves out a branch whose condition reads a defaulted property', () => {
    const keys = objectEvaluatedKeys(
      {
        type: 'object',
        properties: { a: { type: 'number', default: 0 }, kind: { default: 'x' } },
        dependentSchemas: { a: { properties: { b: {} } } },
        if: { properties: { kind: { const: 'x' } } },
        // oxlint-disable-next-line unicorn/no-thenable -- the JSON Schema keyword, not a promise
        then: { properties: { c: {} } },
        unevaluatedProperties: false,
      },
      undefined,
    )
    expect(hasBranchKeys(keys)).toBe(false)
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
    expect(isEvaluatedObjectKeyExpression(keys, 'key', 'input', () => 'IF')).toBe(
      'Object.hasOwn(input,"a")',
    )
  })
})

describe('withoutShadowedUnevaluated (#93)', () => {
  it.each<[JSONSchema, JSONSchema]>([
    [
      {
        properties: { a: {} },
        additionalProperties: { type: 'string' },
        unevaluatedProperties: false,
        'x-unevaluatedProperties-message': 'no',
      },
      { properties: { a: {} }, additionalProperties: { type: 'string' } },
    ],
    [
      { additionalProperties: true, unevaluatedProperties: { type: 'integer' } },
      { additionalProperties: true },
    ],
    [
      { additionalProperties: false, unevaluatedProperties: false },
      { additionalProperties: false },
    ],
    [
      {
        additionalProperties: false,
        unevaluatedProperties: false,
        'x-unevaluatedProperties-message': 'nope',
      },
      { additionalProperties: false, 'x-additionalProperties-message': 'nope' },
    ],
    [
      {
        additionalProperties: false,
        unevaluatedProperties: false,
        'x-additionalProperties-message': 'own',
        'x-unevaluatedProperties-message': 'nope',
      },
      { additionalProperties: false, 'x-additionalProperties-message': 'own' },
    ],
    [
      {
        additionalProperties: false,
        unevaluatedProperties: { type: 'integer' },
        'x-unevaluatedProperties-message': 'must be an integer',
      },
      { additionalProperties: false },
    ],
    [{ unevaluatedProperties: false }, { unevaluatedProperties: false }],
    [{ additionalProperties: true }, { additionalProperties: true }],
  ])('withoutShadowedUnevaluated(%o) → %o', (schema, expected) => {
    expect(withoutShadowedUnevaluated(schema)).toStrictEqual(expected)
  })
})

describe('evaluatedObjectKeysCheck (#94)', () => {
  const every = (isEvaluated: string | undefined) =>
    isEvaluated === undefined
      ? 'Object.keys(input).length===0'
      : `Object.keys(input).every((key)=>${isEvaluated})`

  it('tests the if schema once per value, outside the per-key callback', () => {
    const keys = objectEvaluatedKeys(
      {
        unevaluatedProperties: false,
        properties: { kind: {} },
        if: { properties: { kind: { const: 'x' } } },
        // eslint-disable-next-line unicorn/no-thenable -- JSON Schema `then` keyword, not a Promise thenable
        then: { properties: { x: {} } },
      },
      undefined,
    )
    expect(evaluatedObjectKeysCheck(keys, 'key', 'input', () => 'IF(input)', every)).toBe(
      '((__ifPassed)=>Object.keys(input).every((key)=>["kind"].includes(key)||(__ifPassed&&(["x"].includes(key)))))(IF(input))',
    )
  })

  it('reads no if test when the if branches declare no key', () => {
    const keys = objectEvaluatedKeys(
      {
        unevaluatedProperties: false,
        properties: { kind: {}, x: {} },
        if: { properties: { kind: { const: 'a' } } },
        // eslint-disable-next-line unicorn/no-thenable -- JSON Schema `then` keyword, not a Promise thenable
        then: { required: ['x'] },
      },
      undefined,
    )
    expect(evaluatedObjectKeysCheck(keys, 'key', 'input', () => 'IF(input)', every)).toBe(
      'Object.keys(input).every((key)=>["kind","x"].includes(key))',
    )
  })

  it('reads no if test when no branch declares a key', () => {
    const keys = objectEvaluatedKeys({ properties: { a: {} } }, undefined)
    expect(evaluatedObjectKeysCheck(keys, 'key', 'input', () => 'IF(input)', every)).toBe(
      'Object.keys(input).every((key)=>["a"].includes(key))',
    )
  })
})

describe('ownKeyCheck / requiredKeysCheck (#94)', () => {
  it.each<[string, readonly string[], string]>([
    ['a', [], 'Object.hasOwn(val,"a")'],
    ["it's", [], 'Object.hasOwn(val,"it\'s")'],
    ['constructor', ['constructor'], '("constructor" in val)'],
  ])('ownKeyCheck(val, %j, %j) → %s', (key, stripped, expected) => {
    expect(ownKeyCheck('val', key, stripped)).toBe(expected)
  })

  it.each<[readonly string[], readonly string[], string]>([
    [['a', 'toString'], [], '["a","toString"].every((key)=>Object.hasOwn(val,key))'],
    [['a', '__proto__'], ['__proto__'], 'Object.hasOwn(val,"a")&&("__proto__" in val)'],
  ])('requiredKeysCheck(val, %j, %j) → %s', (required, stripped, expected) => {
    expect(requiredKeysCheck('val', required, stripped)).toBe(expected)
  })
})

describe('key patterns read \\p{…} with the u flag (#135)', () => {
  it.each([
    ['zod', zod],
    ['valibot', valibot],
    ['effect', effect],
    ['arktype', arktype],
  ] as const)('%s', (_, generate) => {
    const out = generate({
      type: 'object',
      patternProperties: { '^\\p{L}+$': { type: 'string' } },
      additionalProperties: false,
    })
    expect(out).toContain('new RegExp("^\\\\p{L}+$","u")')
    expect(out).not.toContain('new RegExp("^\\\\p{L}+$")')
  })
})

describe('evaluated-key checks read \\p{…} with the u flag (#135)', () => {
  it.each([
    ['zod', zod],
    ['valibot', valibot],
    ['effect', effect],
  ] as const)('%s with unevaluatedProperties: false', (_, generate) => {
    const out = generate({
      type: 'object',
      allOf: [{ type: 'object' }],
      patternProperties: { '^\\p{L}+$': { type: 'number' } },
      unevaluatedProperties: false,
    })
    expect(out).toContain('new RegExp("^\\\\p{L}+$","u")')
    expect(out).not.toContain('new RegExp("^\\\\p{L}+$")')
  })

  it('arktype reads a string pattern with a message as it does without one', () => {
    const out = arktype({ type: 'string', pattern: '^\\p{L}+$', 'x-pattern-message': 'letters' })
    expect(out).toContain('/^\\p{L}+$/u.test(data)')
  })
})
