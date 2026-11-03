import { Schema } from 'effect'

export const Extended = Schema.Unknown.check(
  Schema.makeFilter(
    (input) =>
      typeof input !== 'object' ||
      input === null ||
      Array.isArray(input) ||
      Object.entries(input).every(
        ([k, v]) => !new RegExp('^x-').test(k) || Schema.is(Schema.toEncoded(Schema.String))(v),
      ),
  ),
  Schema.makeFilter(
    (input) =>
      typeof input !== 'object' ||
      input === null ||
      Array.isArray(input) ||
      Object.entries(input).every(
        ([k, v]) => ['a'].includes(k) || new RegExp('^x-').test(k) || false,
      ),
  ),
).pipe(Schema.decodeTo(Schema.Struct({ a: Schema.optionalKey(Schema.String) })))

export type Extended = typeof Extended.Type
