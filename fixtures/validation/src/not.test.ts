import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { type } from 'arktype'
import { Schema as EffectSchema } from 'effect'
import * as v from 'valibot'
import { describe, expect, it } from 'vite-plus/test'
import * as z from 'zod'

const ZodNotString = z
  .any()
  .refine((value) => typeof value !== 'string', { error: 'Must not be a string' })

const ValibotNotString = v.custom<unknown>((value) => typeof value !== 'string')

const EffectNotString = EffectSchema.Unknown.check(
  EffectSchema.makeFilter((value) => typeof value !== 'string'),
)

const TypeboxNotString = Type.Not(Type.String())

const ArktypeNotString = type('unknown').narrow((value: unknown) => typeof value !== 'string')

const cases: ReadonlyArray<readonly [string, unknown, boolean]> = [
  ['string is rejected', 'hello', false],
  ['empty string is rejected', '', false],
  ['number is accepted', 42, true],
  ['boolean is accepted', true, true],
  ['null is accepted', null, true],
  ['array is accepted', [1, 2], true],
  ['object is accepted', { a: 1 }, true],
]

describe('not — anything except string', () => {
  describe('zod', () => {
    it.each(cases)('%s', (_, input, expected) => {
      expect(ZodNotString.safeParse(input).success).toBe(expected)
    })
  })

  describe('valibot', () => {
    it.each(cases)('%s', (_, input, expected) => {
      expect(v.safeParse(ValibotNotString, input).success).toBe(expected)
    })
  })

  describe('effect', () => {
    const isNotString = EffectSchema.is(EffectNotString)
    it.each(cases)('%s', (_, input, expected) => {
      expect(isNotString(input)).toBe(expected)
    })
  })

  describe('typebox', () => {
    it.each(cases)('%s', (_, input, expected) => {
      expect(Value.Check(TypeboxNotString, input)).toBe(expected)
    })
  })

  describe('arktype', () => {
    const isValid = (input: unknown) => !(ArktypeNotString(input) instanceof type.errors)
    it.each(cases)('%s', (_, input, expected) => {
      expect(isValid(input)).toBe(expected)
    })
  })
})
