import { Schema } from 'effect'

export const Mixed = Schema.Record(Schema.String, Schema.Unknown).check(
  Schema.makeFilter((input) =>
    Object.entries(input).every(
      ([key, value]) =>
        !new RegExp('^S:').test(key) || Schema.is(Schema.toEncoded(Schema.String))(value),
    ),
  ),
  Schema.makeFilter((input) =>
    Object.entries(input).every(
      ([key, value]) =>
        !new RegExp('^I:').test(key) ||
        Schema.is(Schema.toEncoded(Schema.Number.check(Schema.isInt())))(value),
    ),
  ),
)

export type Mixed = typeof Mixed.Type
