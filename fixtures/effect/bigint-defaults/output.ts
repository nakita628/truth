import { Effect, Schema, SchemaTransformation } from 'effect'

type _Limits = {
  readonly between?: bigint
  readonly large?: bigint
  readonly level?: 9007199254740992n | 2n
  readonly big?: _Big
}

type _Big = bigint

const Big: Schema.Schema<_Big> = Schema.BigInt

export const Limits: Schema.Schema<_Limits> = Schema.Struct({
  between: Schema.optionalKey(
    Schema.BigInt.check(
      Schema.isGreaterThanOrEqualToBigInt(BigInt(1)),
      Schema.isGreaterThanBigInt(BigInt(5)),
      Schema.isLessThanOrEqualToBigInt(BigInt(10)),
      Schema.isLessThanBigInt(BigInt(8)),
    ),
  ),
  large: Schema.Union([
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
    .check(
      Schema.isBetweenBigInt({ minimum: -9223372036854775808n, maximum: 9223372036854775807n }),
    )
    .pipe(Schema.withDecodingDefault(Effect.succeed(9007199254740992n))),
  level: Schema.optionalKey(
    Schema.Union([
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
      .pipe(Schema.decodeTo(Schema.Literals([9007199254740992n, 2n]))),
  ),
  big: Schema.suspend(() => Big).pipe(Schema.withDecodingDefault(Effect.succeed(BigInt(5)))),
})

export type Limits = typeof Limits.Type
