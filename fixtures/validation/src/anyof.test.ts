import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { type } from 'arktype'
import { Schema as EffectSchema } from 'effect'
import * as v from 'valibot'
import { describe, expect, it } from 'vite-plus/test'
import * as z from 'zod'

const ZodStringOrNumber = z.union([z.string(), z.number()], {
  error: 'Must be string or number',
})

const ValibotStringOrNumber = v.union([v.string(), v.number()])

const EffectStringOrNumber = EffectSchema.Union([EffectSchema.String, EffectSchema.Number])

const TypeboxStringOrNumber = Type.Union([Type.String(), Type.Number()])

const ArktypeStringOrNumber = type('string | number')

const cases: ReadonlyArray<readonly [string, unknown, boolean]> = [
  ['string', 'hello', true],
  ['number', 42, true],
  ['zero', 0, true],
  ['empty string', '', true],
  ['boolean', true, false],
  ['null', null, false],
  ['undefined', undefined, false],
  ['array', [], false],
  ['object', {}, false],
]

describe('anyof — string | number', () => {
  describe('zod', () => {
    it.each(cases)('%s', (_, input, expected) => {
      expect(ZodStringOrNumber.safeParse(input).success).toBe(expected)
    })
  })

  describe('valibot', () => {
    it.each(cases)('%s', (_, input, expected) => {
      expect(v.safeParse(ValibotStringOrNumber, input).success).toBe(expected)
    })
  })

  describe('effect', () => {
    const isStringOrNumber = EffectSchema.is(EffectStringOrNumber)
    it.each(cases)('%s', (_, input, expected) => {
      expect(isStringOrNumber(input)).toBe(expected)
    })
  })

  describe('typebox', () => {
    it.each(cases)('%s', (_, input, expected) => {
      expect(Value.Check(TypeboxStringOrNumber, input)).toBe(expected)
    })
  })

  describe('arktype', () => {
    const isValid = (input: unknown) => !(ArktypeStringOrNumber(input) instanceof type.errors)
    it.each(cases)('%s', (_, input, expected) => {
      expect(isValid(input)).toBe(expected)
    })
  })
})
