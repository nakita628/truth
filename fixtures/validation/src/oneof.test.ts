import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { type } from 'arktype'
import { Schema as EffectSchema } from 'effect'
import * as v from 'valibot'
import { describe, expect, it } from 'vite-plus/test'
import * as z from 'zod'

const ZodShape = z.discriminatedUnion(
  'kind',
  [
    z.object({ kind: z.literal('circle'), radius: z.number() }),
    z.object({ kind: z.literal('rectangle'), width: z.number(), height: z.number() }),
  ],
  { error: 'Must be a valid shape' },
)

const ValibotShape = v.variant('kind', [
  v.object({ kind: v.literal('circle'), radius: v.number() }),
  v.object({ kind: v.literal('rectangle'), width: v.number(), height: v.number() }),
])

const EffectShape = EffectSchema.Union([
  EffectSchema.Struct({ kind: EffectSchema.Literal('circle'), radius: EffectSchema.Number }),
  EffectSchema.Struct({
    kind: EffectSchema.Literal('rectangle'),
    width: EffectSchema.Number,
    height: EffectSchema.Number,
  }),
])

const TypeboxShape = Type.Union([
  Type.Object({ kind: Type.Literal('circle'), radius: Type.Number() }),
  Type.Object({ kind: Type.Literal('rectangle'), width: Type.Number(), height: Type.Number() }),
])

const ArktypeShape = type(type({ kind: "'circle'", radius: 'number' })).or(
  type({ kind: "'rectangle'", width: 'number', height: 'number' }),
)

const validCircle = { kind: 'circle', radius: 5 }
const validRectangle = { kind: 'rectangle', width: 10, height: 20 }
const invalidKind = { kind: 'triangle', sides: 3 }
const missingProperty = { kind: 'circle' }
const wrongType = { kind: 'circle', radius: 'big' }

describe('oneof — discriminated union of {kind:circle,radius} | {kind:rectangle,width,height}', () => {
  describe('zod', () => {
    it.each([
      ['valid circle', validCircle, true],
      ['valid rectangle', validRectangle, true],
      ['invalid discriminator', invalidKind, false],
      ['missing required property', missingProperty, false],
      ['wrong property type', wrongType, false],
    ])('%s', (_, input, expected) => {
      expect(ZodShape.safeParse(input).success).toBe(expected)
    })
  })

  describe('valibot', () => {
    it.each([
      ['valid circle', validCircle, true],
      ['valid rectangle', validRectangle, true],
      ['invalid discriminator', invalidKind, false],
      ['missing required property', missingProperty, false],
      ['wrong property type', wrongType, false],
    ])('%s', (_, input, expected) => {
      expect(v.safeParse(ValibotShape, input).success).toBe(expected)
    })
  })

  describe('effect', () => {
    const isShape = EffectSchema.is(EffectShape)
    it.each([
      ['valid circle', validCircle, true],
      ['valid rectangle', validRectangle, true],
      ['invalid discriminator', invalidKind, false],
      ['missing required property', missingProperty, false],
      ['wrong property type', wrongType, false],
    ])('%s', (_, input, expected) => {
      expect(isShape(input)).toBe(expected)
    })
  })

  describe('typebox', () => {
    it.each([
      ['valid circle', validCircle, true],
      ['valid rectangle', validRectangle, true],
      ['invalid discriminator', invalidKind, false],
      ['missing required property', missingProperty, false],
      ['wrong property type', wrongType, false],
    ])('%s', (_, input, expected) => {
      expect(Value.Check(TypeboxShape, input)).toBe(expected)
    })
  })

  describe('arktype', () => {
    const isValid = (input: unknown) => !(ArktypeShape(input) instanceof type.errors)
    it.each([
      ['valid circle', validCircle, true],
      ['valid rectangle', validRectangle, true],
      ['invalid discriminator', invalidKind, false],
      ['missing required property', missingProperty, false],
      ['wrong property type', wrongType, false],
    ])('%s', (_, input, expected) => {
      expect(isValid(input)).toBe(expected)
    })
  })
})
