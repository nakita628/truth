import { Schema } from 'effect'

export const Schema_ = Schema.Struct({
  none: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({ a: Schema.optionalKey(Schema.String) }), [
      Schema.Record(Schema.String, Schema.Unknown),
    ]).check(Schema.makeFilter((input) => Object.keys(input).length === 0)),
  ),
  mixed: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({ a: Schema.optionalKey(Schema.String) }), [
      Schema.Record(Schema.String, Schema.Unknown),
    ]).check(Schema.makeFilter((input) => Object.keys(input).every((key) => ['a'].includes(key)))),
  ),
  record: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String).check(
      Schema.makeFilter((input) => Object.keys(input).length === 0),
    ),
  ),
})

export type Schema_ = typeof Schema_.Type
