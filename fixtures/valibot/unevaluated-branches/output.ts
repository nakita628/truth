import * as v from 'valibot'

export const Schema = v.pipe(
  v.partial(v.looseObject({ a: v.number(), kind: v.string() })),
  v.check((input) => Object.keys(input).every((key) => ['a', 'kind', 'x', 'y', 'b'].includes(key))),
  v.check(
    (input) =>
      !('a' in input) || v.safeParse(v.partial(v.object({ b: v.number() })), input).success,
  ),
  v.check(
    (input) =>
      !v.safeParse(v.object({ kind: v.literal('x') }), input).success ||
      v.safeParse(v.partial(v.object({ x: v.number() })), input).success,
  ),
  v.check(
    (input) =>
      v.safeParse(v.object({ kind: v.literal('x') }), input).success ||
      v.safeParse(v.partial(v.object({ y: v.number() })), input).success,
  ),
)

export type SchemaOutput = v.InferOutput<typeof Schema>
