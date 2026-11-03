import { Schema } from 'effect'

export const KeyRules = Schema.StructWithRest(Schema.Struct({ a: Schema.String }), [
  Schema.Record(Schema.String, Schema.Unknown),
]).check(
  Schema.makeFilter((input) =>
    Object.entries(input).every(
      ([key, value]) =>
        !new RegExp('^x-').test(key) || Schema.is(Schema.toEncoded(Schema.String))(value),
    ),
  ),
  Schema.makeFilter((input) => ['kind'].every((key) => key in input)),
  Schema.makeFilter((input) =>
    Object.entries(input).every(
      ([key, value]) =>
        ['a'].includes(key) ||
        new RegExp('^x-').test(key) ||
        Schema.is(Schema.toEncoded(Schema.Number.check(Schema.isInt())))(value),
    ),
  ),
)

export type KeyRules = typeof KeyRules.Type
