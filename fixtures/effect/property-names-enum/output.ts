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
  bare: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter((input) => Object.keys(input).length === 0),
    ),
  ),
  pattern: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter((input) => Object.keys(input).every((key) => new RegExp('^a').test(key))),
    ),
  ),
  open: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter((input) => Object.keys(input).every((key) => new RegExp('^a').test(key))),
    ),
  ),
  both: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter(
        (input) =>
          Object.keys(input).every((key) => new RegExp('^[a-z]+$').test(key)) &&
          Object.keys(input).every((key) => ['a', 'B'].includes(key)),
      ),
    ),
  ),
  closed: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter((input) => Object.keys(input).length === 0),
    ),
  ),
  single: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter((input) => Object.keys(input).every((key) => ['a'].includes(key))),
    ),
  ),
  letters: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({}), [Schema.Record(Schema.String, Schema.Unknown)]).check(
      Schema.makeFilter((input) =>
        Object.keys(input).every((key) => new RegExp('^\\p{L}+$', 'u').test(key)),
      ),
    ),
  ),
})

export type Schema_ = typeof Schema_.Type
