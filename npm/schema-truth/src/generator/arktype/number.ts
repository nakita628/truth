import { NUMBER_RANGES } from '../../constants/index.js'
import { integerWirePattern, numberWirePattern } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'

/** One numeric comparator. `value` is the source literal, which may be exponent notation. */
export type NumericBound = {
  readonly op: '>=' | '>' | '<=' | '<' | '%'
  readonly value: string
}

/** The comparators of a numeric node: `>= 1`, `< 5`, `% 2`. */
export function numericConstraints(schema: JSONSchema) {
  const minimum =
    schema.minimum !== undefined
      ? ({
          op: schema.exclusiveMinimum === true ? '>' : '>=',
          value: String(schema.minimum),
        } as const)
      : typeof schema.exclusiveMinimum === 'number'
        ? ({ op: '>', value: String(schema.exclusiveMinimum) } as const)
        : undefined
  const maximum =
    schema.maximum !== undefined
      ? ({
          op: schema.exclusiveMaximum === true ? '<' : '<=',
          value: String(schema.maximum),
        } as const)
      : typeof schema.exclusiveMaximum === 'number'
        ? ({ op: '<', value: String(schema.exclusiveMaximum) } as const)
        : undefined
  const multipleOf =
    schema.multipleOf !== undefined
      ? ({ op: '%', value: String(schema.multipleOf) } as const)
      : undefined
  return [minimum, maximum, multipleOf].filter((bound) => bound !== undefined)
}

/** The range comparators of a fixed-width numeric `format`, if it has one. */
export function rangeConstraints(format: string | undefined) {
  const range = format === undefined ? undefined : NUMBER_RANGES[format]
  if (range === undefined) return []
  return [
    { op: '>=', value: range.minimum },
    { op: '<=', value: range.maximum },
  ] as const
}

/**
 * A numeric keyword with its comparators as one quoted definition:
 * `"number.integer >= 1 & number.integer <= 5"`. One definition, not an `.and()` chain
 * of them, so a morph can validate its output against it with `.to()`.
 */
export function constraintDefinition(base: string, bounds: readonly NumericBound[]) {
  if (bounds.length === 0) return `"${base}"`
  return `"${bounds.map((bound) => `${base} ${bound.op} ${bound.value}`).join(' & ')}"`
}

/** Whether a bound's literal is exponent notation, which the ArkType string parser rejects. */
export function usesExponent(bounds: readonly NumericBound[]) {
  return bounds.some((bound) => /[eE]/.test(bound.value))
}

/**
 * Bounds as methods on `type("number")`: a JavaScript number literal, so `1e+21` and the
 * float32 limits never enter the string parser.
 */
export function methodChain(base: string, bounds: readonly NumericBound[]) {
  return `type("${base}")${bounds.map(boundMethod).join('')}`
}

/**
 * The `.narrow(...)` chain of a numeric node whose bounds carry their own messages: the
 * DSL has no message slot, so each keyword becomes a predicate with `ctx.mustBe`.
 */
export function numericNarrows(schema: JSONSchema, errorMessage: string | undefined) {
  const minMessage = schema['x-minimum-message']
  const maxMessage = schema['x-maximum-message']
  const exclusiveMinimumMessage = schema['x-exclusiveMinimum-message']
  const exclusiveMaximumMessage = schema['x-exclusiveMaximum-message']
  const multipleOfMessage = schema['x-multipleOf-message']
  const narrows: string[] = []
  if (schema.minimum !== undefined && schema.exclusiveMinimum !== true) {
    const msg = minMessage ?? errorMessage ?? `must be >= ${schema.minimum}`
    narrows.push(
      `.narrow((data, ctx) => data >= ${schema.minimum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (schema.exclusiveMinimum === true && schema.minimum !== undefined) {
    const msg = exclusiveMinimumMessage ?? errorMessage ?? `must be > ${schema.minimum}`
    narrows.push(
      `.narrow((data, ctx) => data > ${schema.minimum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (typeof schema.exclusiveMinimum === 'number') {
    const msg = exclusiveMinimumMessage ?? errorMessage ?? `must be > ${schema.exclusiveMinimum}`
    narrows.push(
      `.narrow((data, ctx) => data > ${schema.exclusiveMinimum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (schema.maximum !== undefined && schema.exclusiveMaximum !== true) {
    const msg = maxMessage ?? errorMessage ?? `must be <= ${schema.maximum}`
    narrows.push(
      `.narrow((data, ctx) => data <= ${schema.maximum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (schema.exclusiveMaximum === true && schema.maximum !== undefined) {
    const msg = exclusiveMaximumMessage ?? errorMessage ?? `must be < ${schema.maximum}`
    narrows.push(
      `.narrow((data, ctx) => data < ${schema.maximum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (typeof schema.exclusiveMaximum === 'number') {
    const msg = exclusiveMaximumMessage ?? errorMessage ?? `must be < ${schema.exclusiveMaximum}`
    narrows.push(
      `.narrow((data, ctx) => data < ${schema.exclusiveMaximum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (schema.multipleOf !== undefined) {
    const msg = multipleOfMessage ?? errorMessage ?? `must be a multiple of ${schema.multipleOf}`
    narrows.push(
      `.narrow((data, ctx) => data % ${schema.multipleOf} === 0 || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  return narrows.join('')
}

/** Whether any bound of a numeric node carries a message of its own. */
export function hasPerKeywordMessage(schema: JSONSchema) {
  // `.some(Boolean)`, not `??`: an empty message is no message, and the branch it
  // guards would emit `ctx.mustBe('')`.
  return [
    schema['x-minimum-message'],
    schema['x-maximum-message'],
    schema['x-exclusiveMinimum-message'],
    schema['x-exclusiveMaximum-message'],
    schema['x-multipleOf-message'],
  ].some(Boolean)
}

/**
 * A morph reading wire text into a number. The text has to match the integer or JSON
 * number grammar before `Number` sees it: `Number` accepts `""`, `" "`, `"0x10"` and,
 * for an integer, `"1e3"`.
 */
export function numberMorph(guard: 'isFinite' | 'isSafeInteger', expected: string) {
  const pattern = guard === 'isSafeInteger' ? integerWirePattern() : numberWirePattern()
  return `type("string").pipe((data, ctx) => { const value = ${pattern}.test(data) ? Number(data) : Number.NaN; return Number.${guard}(value) ? value : ctx.error(${JSON.stringify(expected)}) })`
}

/**
 * The ArkType definition of a number node: the `number` keyword with its comparators,
 * `float` / `float32` carrying its range. Bounds with messages of their own become a
 * `.narrow()` chain instead.
 */
export function number(schema: JSONSchema) {
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''
  const isFloat32 = schema.format === 'float' || schema.format === 'float32'
  const range = rangeConstraints(isFloat32 ? 'float32' : undefined)
  const constraints = [...range, ...numericConstraints(schema)]
  if (hasPerKeywordMessage(schema)) {
    const base = usesExponent(range)
      ? methodChain('number', range)
      : `type(${constraintDefinition('number', range)})`
    return `${base}${numericNarrows(schema, errorMessage)}${describe}`
  }
  if (usesExponent(constraints)) return `${methodChain('number', constraints)}${describe}`
  const definition = constraintDefinition('number', constraints)
  if (errorMessage) return `type(${definition})${describe}`
  return definition
}

function boundMethod(bound: NumericBound) {
  const name =
    bound.op === '>='
      ? 'atLeast'
      : bound.op === '>'
        ? 'moreThan'
        : bound.op === '<='
          ? 'atMost'
          : bound.op === '<'
            ? 'lessThan'
            : 'divisibleBy'
  return `.${name}(${bound.value})`
}
