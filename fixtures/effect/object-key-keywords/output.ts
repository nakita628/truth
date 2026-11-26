import { Schema } from 'effect'

export const KeyChecks = Schema.Struct({
  counted: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter((input) => Object.keys(input).length >= 2),
    ),
  ),
  loose: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter((input) => Object.keys(input).length <= 1),
    ),
  ),
  dep: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter((input) => !Object.hasOwn(input, 'a') || Object.hasOwn(input, 'b')),
    ),
  ),
  open: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
  strings: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter((input) => Object.keys(input).length >= 1),
      Schema.makeFilter((input) =>
        Object.values(input).every((value) => Schema.is(Schema.toEncoded(Schema.String))(value)),
      ),
    ),
  ),
})

export type KeyChecks = typeof KeyChecks.Type
