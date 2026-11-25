import * as v from 'valibot'

export const Schema = v.pipe(
  v.partial(v.looseObject({ a: v.number(), kind: v.string() })),
  v.check((input) =>
    ((ifPassed) =>
      Object.keys(input).every(
        (key) =>
          ['a', 'kind'].includes(key) ||
          (ifPassed && ['flag', 'x'].includes(key)) ||
          (!ifPassed && ['y'].includes(key)) ||
          (Object.hasOwn(input, 'a') && ['b'].includes(key)) ||
          (Object.hasOwn(input, 'constructor') && ['c2'].includes(key)),
      ))(
      v.safeParse(v.object({ kind: v.literal('x'), flag: v.optional(v.literal(true)) }), input)
        .success,
    ),
  ),
  v.check(
    (input) =>
      !Object.hasOwn(input, 'a') ||
      v.safeParse(v.partial(v.object({ b: v.number() })), input).success,
  ),
  v.check(
    (input) =>
      !Object.hasOwn(input, 'constructor') ||
      v.safeParse(v.partial(v.object({ c2: v.number() })), input).success,
  ),
  v.check(
    (input) =>
      !v.safeParse(v.object({ kind: v.literal('x'), flag: v.optional(v.literal(true)) }), input)
        .success || v.safeParse(v.partial(v.object({ x: v.number() })), input).success,
  ),
  v.check(
    (input) =>
      v.safeParse(v.object({ kind: v.literal('x'), flag: v.optional(v.literal(true)) }), input)
        .success || v.safeParse(v.partial(v.object({ y: v.number() })), input).success,
  ),
)

export type SchemaOutput = v.InferOutput<typeof Schema>
