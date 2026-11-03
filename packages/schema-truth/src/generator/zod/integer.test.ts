import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { integer } from './integer.js'

describe('integer', () => {
  describe('type: integer', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer' }, 'z.int()'],
      [{ type: 'integer', minimum: 0, exclusiveMinimum: true }, 'z.int().positive()'],
      [{ type: 'integer', minimum: 0, exclusiveMinimum: false }, 'z.int().nonnegative()'],
      [{ type: 'integer', maximum: 0, exclusiveMaximum: true }, 'z.int().negative()'],
      [{ type: 'integer', maximum: 0, exclusiveMaximum: false }, 'z.int().nonpositive()'],
      [{ type: 'integer', minimum: 100 }, 'z.int().min(100)'],
      [{ type: 'integer', minimum: 0 }, 'z.int().min(0)'],
      [{ type: 'integer', minimum: 100, exclusiveMinimum: true }, 'z.int().gt(100)'],
      [{ type: 'integer', maximum: 100 }, 'z.int().max(100)'],
      [{ type: 'integer', maximum: 0 }, 'z.int().max(0)'],
      [{ type: 'integer', maximum: 100, exclusiveMaximum: true }, 'z.int().lt(100)'],
      [{ type: 'integer', exclusiveMaximum: 100 }, 'z.int().lt(100)'],
      [{ type: 'integer', multipleOf: 2 }, 'z.int().multipleOf(2)'],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })

  describe('type: integer, format: int32', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer', format: 'int32' }, 'z.int32()'],
      [
        { type: 'integer', format: 'int32', minimum: 0, exclusiveMinimum: true },
        'z.int32().positive()',
      ],
      [
        { type: 'integer', format: 'int32', minimum: 0, exclusiveMinimum: false },
        'z.int32().nonnegative()',
      ],
      [
        { type: 'integer', format: 'int32', maximum: 0, exclusiveMaximum: true },
        'z.int32().negative()',
      ],
      [
        { type: 'integer', format: 'int32', maximum: 0, exclusiveMaximum: false },
        'z.int32().nonpositive()',
      ],
      [{ type: 'integer', format: 'int32', minimum: 100 }, 'z.int32().min(100)'],
      [
        { type: 'integer', format: 'int32', minimum: 100, exclusiveMinimum: true },
        'z.int32().gt(100)',
      ],
      [{ type: 'integer', format: 'int32', maximum: 100 }, 'z.int32().max(100)'],
      [
        { type: 'integer', format: 'int32', maximum: 100, exclusiveMaximum: true },
        'z.int32().lt(100)',
      ],
      [{ type: 'integer', format: 'int32', multipleOf: 2 }, 'z.int32().multipleOf(2)'],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })

  describe('type: integer, format: int64', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'integer', format: 'int64' },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64())`,
      ],
      [
        { type: 'integer', format: 'int64', minimum: 0, exclusiveMinimum: true },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().positive())`,
      ],
      [
        { type: 'integer', format: 'int64', minimum: 0, exclusiveMinimum: false },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().nonnegative())`,
      ],
      [
        { type: 'integer', format: 'int64', maximum: 0, exclusiveMaximum: true },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().negative())`,
      ],
      [
        { type: 'integer', format: 'int64', maximum: 0, exclusiveMaximum: false },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().nonpositive())`,
      ],
      [
        { type: 'integer', format: 'int64', minimum: 100 },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().min(100n))`,
      ],
      [
        { type: 'integer', format: 'int64', minimum: 100, exclusiveMinimum: true },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().gt(100n))`,
      ],
      [
        { type: 'integer', format: 'int64', maximum: 100 },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().max(100n))`,
      ],
      [
        { type: 'integer', format: 'int64', maximum: 100, exclusiveMaximum: true },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().lt(100n))`,
      ],
      [
        { type: 'integer', format: 'int64', multipleOf: 2 },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().multipleOf(2n))`,
      ],
      [
        { type: 'integer', format: 'uint64' },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.uint64())`,
      ],
      [
        { type: 'integer', format: 'uint64', maximum: 10 },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.uint64().max(10n))`,
      ],
      [
        { type: 'integer', format: 'int64', 'x-error-message': 'int64' },
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)],{error:"int64"}).transform((val)=>BigInt(val)).pipe(z.int64({error:"int64"}))`,
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })

  describe('type: integer, format: bigint', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer', format: 'bigint' }, 'z.bigint()'],
      [
        { type: 'integer', format: 'bigint', minimum: 0, exclusiveMinimum: true },
        'z.bigint().positive()',
      ],
      [
        { type: 'integer', format: 'bigint', minimum: 0, exclusiveMinimum: false },
        'z.bigint().nonnegative()',
      ],
      [
        { type: 'integer', format: 'bigint', maximum: 0, exclusiveMaximum: true },
        'z.bigint().negative()',
      ],
      [
        { type: 'integer', format: 'bigint', maximum: 0, exclusiveMaximum: false },
        'z.bigint().nonpositive()',
      ],
      [{ type: 'integer', format: 'bigint', minimum: 100 }, 'z.bigint().min(BigInt(100))'],
      [
        { type: 'integer', format: 'bigint', minimum: 100, exclusiveMinimum: true },
        'z.bigint().gt(BigInt(100))',
      ],
      [{ type: 'integer', format: 'bigint', maximum: 100 }, 'z.bigint().max(BigInt(100))'],
      [
        { type: 'integer', format: 'bigint', maximum: 100, exclusiveMaximum: true },
        'z.bigint().lt(BigInt(100))',
      ],
      [{ type: 'integer', format: 'bigint', multipleOf: 2 }, 'z.bigint().multipleOf(BigInt(2))'],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })

  describe('x-coerce', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer', 'x-coerce': true }, 'z.coerce.number().int()'],
      [
        { type: 'integer', 'x-coerce': true, 'x-error-message': 'Must be integer' },
        'z.coerce.number({error:"Must be integer"}).int({error:"Must be integer"})',
      ],
      [{ type: 'integer', 'x-coerce': true, minimum: 0 }, 'z.coerce.number().int().min(0)'],
      [
        { type: 'integer', 'x-coerce': true, minimum: 1, maximum: 100 },
        'z.coerce.number().int().min(1).max(100)',
      ],
      [{ type: 'integer', format: 'int32', 'x-coerce': true }, 'z.coerce.number().pipe(z.int32())'],
      [
        { type: 'integer', format: 'int32', 'x-coerce': true, minimum: 100 },
        'z.coerce.number().pipe(z.int32().min(100))',
      ],
      [{ type: 'integer', format: 'int64', 'x-coerce': true }, 'z.coerce.bigint().pipe(z.int64())'],
      [
        { type: 'integer', format: 'uint64', 'x-coerce': true },
        'z.coerce.bigint().pipe(z.uint64())',
      ],
      [{ type: 'integer', format: 'bigint', 'x-coerce': true }, 'z.coerce.bigint()'],
      [
        { type: 'integer', format: 'bigint', 'x-coerce': true, 'x-error-message': 'bigint only' },
        'z.coerce.bigint({error:"bigint only"})',
      ],
      // coerce + error-message on pipe paths
      [
        { type: 'integer', format: 'int32', 'x-coerce': true, 'x-error-message': 'int32必須' },
        'z.coerce.number({error:"int32必須"}).pipe(z.int32({error:"int32必須"}))',
      ],
      [
        { type: 'integer', format: 'int64', 'x-coerce': true, 'x-error-message': 'int64必須' },
        'z.coerce.bigint({error:"int64必須"}).pipe(z.int64({error:"int64必須"}))',
      ],
      // coerce + error-message + constraints
      [
        {
          type: 'integer',
          'x-coerce': true,
          minimum: 0,
          'x-error-message': '整数必須',
        },
        'z.coerce.number({error:"整数必須"}).int({error:"整数必須"}).min(0,{error:"整数必須"})',
      ],
      // coerce + x-required-message dropped (unreachable under coerce)
      [
        {
          type: 'integer',
          'x-coerce': true,
          'x-required-message': '必須です',
          'x-error-message': '整数必須',
        },
        'z.coerce.number({error:"整数必須"}).int({error:"整数必須"})',
      ],
      [
        {
          type: 'integer',
          'x-coerce': true,
          'x-required-message': '必須です',
        },
        'z.coerce.number().int()',
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'integer', 'x-error-message': 'Must be an integer' },
        'z.int({error:"Must be an integer"})',
      ],
      [
        { type: 'integer', format: 'int32', 'x-error-message': 'Must be int32' },
        'z.int32({error:"Must be int32"})',
      ],
      [
        {
          type: 'integer',
          minimum: 1,
          maximum: 999,
          'x-minimum-message': 'Min 1',
          'x-maximum-message': 'Max 999',
        },
        'z.int().min(1,{error:"Min 1"}).max(999,{error:"Max 999"})',
      ],
      [
        {
          type: 'integer',
          multipleOf: 10,
          'x-multipleOf-message': 'Must be a multiple of 10',
        },
        'z.int().multipleOf(10,{error:"Must be a multiple of 10"})',
      ],
      // x-error-message falls back to min/max/multipleOf when no specific message
      [
        { type: 'integer', minimum: 0, 'x-error-message': '整数必須' },
        'z.int({error:"整数必須"}).min(0,{error:"整数必須"})',
      ],
      [
        { type: 'integer', multipleOf: 2, 'x-error-message': '偶数のみ' },
        'z.int({error:"偶数のみ"}).multipleOf(2,{error:"偶数のみ"})',
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })
})
