import { Schema } from 'effect'

export const Schema_ = Schema.StructWithRest(
  Schema.Struct({ a: Schema.optionalKey(Schema.Number), kind: Schema.optionalKey(Schema.String) }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).check(
  Schema.makeFilter((input) =>
    ((ifPassed) =>
      Object.keys(input).every(
        (key) =>
          ['a', 'kind'].includes(key) ||
          (ifPassed && ['flag', 'x'].includes(key)) ||
          (!ifPassed && ['y'].includes(key)) ||
          (Object.hasOwn(input, 'a') && ['b'].includes(key)) ||
          (Object.hasOwn(input, 'constructor') && ['c2'].includes(key)),
      ))(
      Schema.is(
        Schema.Struct({
          kind: Schema.Literal('x'),
          flag: Schema.optionalKey(Schema.Literal(true)),
        }),
      )(input),
    ),
  ),
  Schema.makeFilter(
    (input) =>
      !Object.hasOwn(input, 'a') ||
      Schema.is(Schema.Struct({ b: Schema.optionalKey(Schema.Number) }))(input),
  ),
  Schema.makeFilter(
    (input) =>
      !Object.hasOwn(input, 'constructor') ||
      Schema.is(Schema.Struct({ c2: Schema.optionalKey(Schema.Number) }))(input),
  ),
  Schema.makeFilter(
    (input) =>
      !Schema.is(
        Schema.Struct({
          kind: Schema.Literal('x'),
          flag: Schema.optionalKey(Schema.Literal(true)),
        }),
      )(input) || Schema.is(Schema.Struct({ x: Schema.optionalKey(Schema.Number) }))(input),
  ),
  Schema.makeFilter(
    (input) =>
      Schema.is(
        Schema.Struct({
          kind: Schema.Literal('x'),
          flag: Schema.optionalKey(Schema.Literal(true)),
        }),
      )(input) || Schema.is(Schema.Struct({ y: Schema.optionalKey(Schema.Number) }))(input),
  ),
)

export type Schema_ = typeof Schema_.Type
