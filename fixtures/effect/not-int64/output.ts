import { Schema, SchemaTransformation } from 'effect'

export const Amount = Schema.Union([
  Schema.BigInt,
  Schema.Number.check(Schema.isInt()),
  Schema.String.check(Schema.isPattern(/^-?\d+$/)),
])
  .pipe(
    Schema.decodeTo(
      Schema.BigInt,
      SchemaTransformation.transform({
        decode: (input) => BigInt(input),
        encode: (output) => output,
      }),
    ),
  )
  .check(Schema.isBetweenBigInt({ minimum: -9223372036854775808n, maximum: 9223372036854775807n }))
  .check(Schema.makeFilter((input) => ![0n].some((item) => item === input)))

export type Amount = typeof Amount.Type
