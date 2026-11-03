import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { type } from 'arktype'
import { Schema as EffectSchema } from 'effect'
import * as v from 'valibot'
import { describe, expect, it } from 'vite-plus/test'
import * as z from 'zod'

const ZodCombined = z.intersection(
  z.object({ name: z.string() }),
  z.object({ age: z.number() }),
)

const ValibotCombined = v.intersect([
  v.object({ name: v.string() }),
  v.object({ age: v.number() }),
])

const EffectCombined = EffectSchema.Struct({
  ...EffectSchema.Struct({ name: EffectSchema.String }).fields,
  ...EffectSchema.Struct({ age: EffectSchema.Number }).fields,
})

const TypeboxCombined = Type.Intersect([
  Type.Object({ name: Type.String() }),
  Type.Object({ age: Type.Number() }),
])

const ArktypeCombined = type(type({ name: 'string' })).and(type({ age: 'number' }))

const cases: ReadonlyArray<readonly [string, unknown, boolean]> = [
  ['both fields present', { name: 'Alice', age: 30 }, true],
  ['missing age', { name: 'Alice' }, false],
  ['missing name', { age: 30 }, false],
  ['empty object', {}, false],
  ['wrong name type', { name: 42, age: 30 }, false],
  ['wrong age type', { name: 'Alice', age: 'old' }, false],
]

describe('allof — {name: string} & {age: number}', () => {
  describe('zod', () => {
    it.each(cases)('%s', (_, input, expected) => {
      expect(ZodCombined.safeParse(input).success).toBe(expected)
    })
  })

  describe('valibot', () => {
    it.each(cases)('%s', (_, input, expected) => {
      expect(v.safeParse(ValibotCombined, input).success).toBe(expected)
    })
  })

  describe('effect', () => {
    const isCombined = EffectSchema.is(EffectCombined)
    it.each(cases)('%s', (_, input, expected) => {
      expect(isCombined(input)).toBe(expected)
    })
  })

  describe('typebox', () => {
    it.each(cases)('%s', (_, input, expected) => {
      expect(Value.Check(TypeboxCombined, input)).toBe(expected)
    })
  })

  describe('arktype', () => {
    const isValid = (input: unknown) => !(ArktypeCombined(input) instanceof type.errors)
    it.each(cases)('%s', (_, input, expected) => {
      expect(isValid(input)).toBe(expected)
    })
  })
})
