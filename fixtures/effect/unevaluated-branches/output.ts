import { Schema } from 'effect'

export const Schema_ = Schema.StructWithRest(
  Schema.Struct({ a: Schema.optionalKey(Schema.Number), kind: Schema.optionalKey(Schema.String) }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).check(
  Schema.makeFilter((input) =>
    Object.keys(input).every((key) => ['a', 'kind', 'x', 'y', 'b'].includes(key)),
  ),
  Schema.makeFilter(
    (input) =>
      !('a' in input) || Schema.is(Schema.Struct({ b: Schema.optionalKey(Schema.Number) }))(input),
  ),
  Schema.makeFilter(
    (input) =>
      !Schema.is(Schema.Struct({ kind: Schema.Literal('x') }))(input) ||
      Schema.is(Schema.Struct({ x: Schema.optionalKey(Schema.Number) }))(input),
  ),
  Schema.makeFilter(
    (input) =>
      Schema.is(Schema.Struct({ kind: Schema.Literal('x') }))(input) ||
      Schema.is(Schema.Struct({ y: Schema.optionalKey(Schema.Number) }))(input),
  ),
)

export type Schema_ = typeof Schema_.Type
