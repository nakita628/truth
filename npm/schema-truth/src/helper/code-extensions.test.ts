import { describe, expect, it } from 'vite-plus/test'

import {
  ALL_CODE_EXTENSION_KEYS,
  ARKTYPE_CODE_EXTENSION_KEYS,
  EFFECT_CODE_EXTENSION_KEYS,
  IF_THEN_ELSE_UNSUPPORTED_MARKER,
  UNSAFE_GENERATED_MARKER,
  VALIBOT_CODE_EXTENSION_KEYS,
  ZOD_CODE_EXTENSION_KEYS,
} from '../constants/index.js'
import type { JSONSchema } from '../parser/index.js'
import {
  findCodeExtensionKeysInSchema,
  isSafeCodeExtension,
  readCodeExtension,
} from './code-extensions.js'
import { hasIfThenElse } from './walk.js'

describe('code-extensions', () => {
  describe('ZOD_CODE_EXTENSION_KEYS', () => {
    it('lists Zod code-extension keys', () => {
      expect(ZOD_CODE_EXTENSION_KEYS).toStrictEqual([
        'x-refine',
        'x-transform',
        'x-pipe',
        'x-codec',
        'x-preprocess',
      ])
    })
  })

  describe('VALIBOT_CODE_EXTENSION_KEYS', () => {
    it('lists Valibot code-extension keys', () => {
      expect(VALIBOT_CODE_EXTENSION_KEYS).toStrictEqual(['x-check', 'x-transform', 'x-pipe'])
    })
  })

  describe('EFFECT_CODE_EXTENSION_KEYS', () => {
    it('lists Effect code-extension keys', () => {
      expect(EFFECT_CODE_EXTENSION_KEYS).toStrictEqual(['x-filter', 'x-transform', 'x-pipe'])
    })
  })

  describe('ARKTYPE_CODE_EXTENSION_KEYS', () => {
    it('lists ArkType code-extension keys', () => {
      expect(ARKTYPE_CODE_EXTENSION_KEYS).toStrictEqual(['x-narrow', 'x-morph', 'x-pipe'])
    })
  })

  describe('ALL_CODE_EXTENSION_KEYS', () => {
    it('is the deduplicated, sorted union of per-lib keys', () => {
      expect(ALL_CODE_EXTENSION_KEYS).toStrictEqual([
        'x-check',
        'x-codec',
        'x-filter',
        'x-morph',
        'x-narrow',
        'x-pipe',
        'x-preprocess',
        'x-refine',
        'x-transform',
      ])
    })
  })

  describe('UNSAFE_GENERATED_MARKER', () => {
    it('is the canonical marker comment', () => {
      expect(UNSAFE_GENERATED_MARKER).toBe('// @generated-with-unsafe-code-extensions')
    })
  })

  describe('isSafeCodeExtension', () => {
    it.concurrent.each<[string, boolean]>([
      ['.refine((val) => val.length >= 8)', true],
      ['.transform((val) => val.toUpperCase())', true],
      ['z.string().pipe(z.number().int().positive())', true],
      [
        'z.codec(z.iso.datetime(), z.date(), { decode: (val) => new Date(val), encode: (val) => val.toISOString() })',
        true,
      ],
      ['.refine((val) => process.exit(1))', false],
      ['.refine(() => require("child_process").execSync("rm -rf /"))', false],
      ['.refine((v) => eval(v))', false],
      ['.refine((v) => Function("return 1")())', false],
      ['.refine((v) => globalThis.fetch("x"))', false],
      ['.refine((v) => v.constructor.constructor("alert(1)")())', false],
      ['.refine((v) => v.__proto__)', false],
      [".refine((v) => v['constructor'])", false],
      ['.refine((v) => v[`constructor`])', false],
      ['.refine((v) => v[\\u0065val])', false],
    ])('isSafeCodeExtension(%s) → %s', (input, expected) => {
      expect(isSafeCodeExtension(input)).toBe(expected)
    })

    it('rejects non-string values', () => {
      expect(isSafeCodeExtension(123)).toBe(false)
      expect(isSafeCodeExtension(undefined)).toBe(false)
      expect(isSafeCodeExtension(null)).toBe(false)
    })
  })

  describe('readCodeExtension', () => {
    const schema = {
      type: 'string',
      'x-refine': '.refine((v) => v.length > 0)',
    } as unknown as JSONSchema

    it('returns undefined when flag is not set', () => {
      expect(readCodeExtension(schema, 'x-refine', undefined)).toBeUndefined()
      expect(readCodeExtension(schema, 'x-refine', {})).toBeUndefined()
      expect(readCodeExtension(schema, 'x-refine', { unsafeCodeExtensions: false })).toBeUndefined()
    })

    it('returns the value when flag is set and value is safe', () => {
      expect(readCodeExtension(schema, 'x-refine', { unsafeCodeExtensions: true })).toBe(
        '.refine((v) => v.length > 0)',
      )
    })

    it('returns undefined when value contains a denied identifier', () => {
      const unsafe = {
        'x-refine': '.refine(() => eval("x"))',
      } as unknown as JSONSchema
      expect(readCodeExtension(unsafe, 'x-refine', { unsafeCodeExtensions: true })).toBeUndefined()
    })

    it('returns undefined for missing key', () => {
      expect(
        readCodeExtension({}, 'x-refine', {
          unsafeCodeExtensions: true,
        }),
      ).toBeUndefined()
    })

    it('returns undefined for non-string value', () => {
      expect(
        readCodeExtension({ 'x-refine': 42 } as unknown as JSONSchema, 'x-refine', {
          unsafeCodeExtensions: true,
        }),
      ).toBeUndefined()
    })
  })

  describe('IF_THEN_ELSE_UNSUPPORTED_MARKER', () => {
    it('is the canonical marker comment', () => {
      expect(IF_THEN_ELSE_UNSUPPORTED_MARKER).toBe(
        '// FIXME: JSON Schema if/then/else is not yet supported by this generator; conditional validation is omitted',
      )
    })
  })

  describe('hasIfThenElse', () => {
    const parse = (json: string) => JSON.parse(json) as unknown as JSONSchema

    it('returns true when top-level if/then/else is present', () => {
      const schema = parse(
        '{"type":"object","if":{"properties":{"kind":{"const":"a"}}},"then":{"required":["x"]}}',
      )
      expect(hasIfThenElse(schema)).toBe(true)
    })

    it('returns true for nested else branch', () => {
      const schema = parse(
        '{"type":"object","properties":{"inner":{"type":"object","else":{"required":["y"]}}}}',
      )
      expect(hasIfThenElse(schema)).toBe(true)
    })

    it('returns false when no conditional keywords are present', () => {
      const schema = parse('{"type":"object","properties":{"name":{"type":"string"}}}')
      expect(hasIfThenElse(schema)).toBe(false)
    })
  })

  describe('findCodeExtensionKeysInSchema', () => {
    it('finds keys at the top level', () => {
      expect(
        findCodeExtensionKeysInSchema({
          type: 'string',
          'x-refine': '.refine(() => true)',
        } as unknown as JSONSchema),
      ).toStrictEqual(['x-refine'])
    })

    it('finds keys deeply nested', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string', 'x-check': 'v.check((v) => v.length > 0)' },
          items: {
            type: 'array',
            items: { type: 'number', 'x-transform': '.transform((v) => v * 2)' },
          },
        },
      } as unknown as JSONSchema
      const found = [...findCodeExtensionKeysInSchema(schema)].sort()
      expect(found).toStrictEqual(['x-check', 'x-transform'])
    })

    it('returns an empty array when no code extensions are present', () => {
      expect(findCodeExtensionKeysInSchema({ type: 'string' })).toStrictEqual([])
    })
  })
})
