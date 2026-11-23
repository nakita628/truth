import { INTEGER_TEXT_PATTERN, NUMBER_RANGES } from '../../constants/index.js'
import { bigintBounds, bigintCall, bigintLiteral } from '../../helper/bigint.js'
import type { BigintSchema } from '../../helper/bigint.js'
import { regexSource } from '../../helper/format.js'
import type { JSONSchema } from '../../parser/index.js'
import {
  constraintDefinition,
  hasPerKeywordMessage,
  methodChain,
  numericConstraints,
  numericNarrows,
  rangeConstraints,
  usesExponent,
} from './number.js'

/** Whether a node is a 64-bit integer: a value beyond 2^53 that is read as a bigint. */
export function isInt64(schema: JSONSchema) {
  return schema.format === 'int64' || schema.format === 'uint64'
}

/**
 * A morph reading a 64-bit integer into a bigint. On the string wire the text is a sign
 * and digits; in a JSON body the value is a bigint, a safe-integer number, or the string
 * of digits that is the only lossless way to carry a larger one.
 */
export function bigintMorph(isWire: boolean) {
  const digits = regexSource(INTEGER_TEXT_PATTERN)
  if (isWire) {
    return `type("string").pipe((data, ctx) => (${digits}.test(data) ? BigInt(data) : ctx.error("an integer")))`
  }
  return `type("bigint | number.integer").or(${digits}).pipe((data) => BigInt(data))`
}

/**
 * The `.narrow(...)` chain holding a bigint within its bounds: ArkType's DSL has no
 * bigint comparators, so each is a predicate with `ctx.mustBe`.
 */
function bigintNarrows(schema: BigintSchema, lit: (n: number | bigint) => string) {
  const range = schema.format === undefined ? undefined : NUMBER_RANGES[schema.format]
  const narrows = [
    range === undefined
      ? undefined
      : `.narrow((data, ctx) => (data >= ${range.minimum} && data <= ${range.maximum}) || ctx.mustBe(${JSON.stringify(schema.format === 'uint64' ? 'a uint64' : 'an int64')}))`,
    schema.minimum === undefined
      ? undefined
      : schema.exclusiveMinimum === true
        ? `.narrow((data, ctx) => data > ${lit(schema.minimum)} || ctx.mustBe(${JSON.stringify(`more than ${BigInt(schema.minimum)}`)}))`
        : `.narrow((data, ctx) => data >= ${lit(schema.minimum)} || ctx.mustBe(${JSON.stringify(`at least ${BigInt(schema.minimum)}`)}))`,
    typeof schema.exclusiveMinimum === 'number'
      ? `.narrow((data, ctx) => data > ${lit(schema.exclusiveMinimum)} || ctx.mustBe(${JSON.stringify(`more than ${BigInt(schema.exclusiveMinimum)}`)}))`
      : undefined,
    schema.maximum === undefined
      ? undefined
      : schema.exclusiveMaximum === true
        ? `.narrow((data, ctx) => data < ${lit(schema.maximum)} || ctx.mustBe(${JSON.stringify(`less than ${BigInt(schema.maximum)}`)}))`
        : `.narrow((data, ctx) => data <= ${lit(schema.maximum)} || ctx.mustBe(${JSON.stringify(`at most ${BigInt(schema.maximum)}`)}))`,
    typeof schema.exclusiveMaximum === 'number'
      ? `.narrow((data, ctx) => data < ${lit(schema.exclusiveMaximum)} || ctx.mustBe(${JSON.stringify(`less than ${BigInt(schema.exclusiveMaximum)}`)}))`
      : undefined,
    schema.multipleOf === undefined
      ? undefined
      : `.narrow((data, ctx) => data % ${lit(schema.multipleOf)} === 0n || ctx.mustBe(${JSON.stringify(`a multiple of ${BigInt(schema.multipleOf)}`)}))`,
  ].filter((v) => v !== undefined)
  return narrows.join('')
}

/**
 * The ArkType definition of an integer node: the `number.integer` keyword with its
 * comparators, `int32` / `uint32` carrying their range. `int64` / `uint64` are bigints
 * wherever they come from, and `bigint` is one too; their bounds are narrows.
 */
export function integer(schema: JSONSchema, options?: { readonly wire?: boolean }) {
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''

  if (schema.format === 'bigint') {
    const narrows = bigintNarrows(bigintBounds(schema), bigintCall)
    const base =
      options?.wire === true
        ? bigintMorph(true)
        : narrows || errorMessage
          ? 'type("bigint")'
          : '"bigint"'
    return `${base}${narrows}${describe}`
  }
  if (isInt64(schema)) {
    return `${bigintMorph(options?.wire === true)}${bigintNarrows(bigintBounds(schema), bigintLiteral)}${describe}`
  }

  const range = rangeConstraints(schema.format)
  const constraints = [...range, ...numericConstraints(schema)]
  if (hasPerKeywordMessage(schema)) {
    const base = usesExponent(range)
      ? methodChain('number.integer', range)
      : `type(${constraintDefinition('number.integer', range)})`
    return `${base}${numericNarrows(schema, errorMessage)}${describe}`
  }
  if (usesExponent(constraints)) return `${methodChain('number.integer', constraints)}${describe}`
  const definition = constraintDefinition('number.integer', constraints)
  if (errorMessage) return `type(${definition})${describe}`
  return definition
}
