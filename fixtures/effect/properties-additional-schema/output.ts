import { Schema } from 'effect'

export const Tagged = Schema.StructWithRest(Schema.Struct({ name: Schema.String }), [
  Schema.Record(Schema.String, Schema.Unknown),
]).check(
  Schema.makeFilter((input) =>
    Object.entries(input).every(
      ([key, value]) =>
        !new RegExp('^x-').test(key) || Schema.is(Schema.toEncoded(Schema.String))(value),
    ),
  ),
  Schema.makeFilter((input) =>
    Object.entries(input).every(
      ([key, value]) =>
        ['name'].includes(key) ||
        new RegExp('^x-').test(key) ||
        Schema.is(Schema.toEncoded(Schema.Number.check(Schema.isInt())))(value),
    ),
  ),
)

export type Tagged = typeof Tagged.Type
