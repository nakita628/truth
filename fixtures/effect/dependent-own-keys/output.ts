import { Schema } from 'effect'

export const OwnKeys = Schema.Struct({
  dep: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({ a: Schema.optionalKey(Schema.String) }), [
      Schema.Record(Schema.String, Schema.Unknown),
    ]).check(
      Schema.makeFilter(
        (input) => !Object.hasOwn(input, "it's") || Object.hasOwn(input, 'back\\slash'),
      ),
      Schema.makeFilter(
        (input) =>
          !Object.hasOwn(input, 'toString') ||
          Schema.is(Schema.Struct({ x: Schema.Number.check(Schema.isInt()) }))(input),
      ),
    ),
  ),
  req: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter((input) => ['toString'].every((key) => Object.hasOwn(input, key))),
    ),
  ),
})

export type OwnKeys = typeof OwnKeys.Type
