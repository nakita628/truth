import { Effect, Schema, SchemaGetter, SchemaIssue, SchemaTransformation } from 'effect'

type _Item = { readonly detail?: _D & { readonly comment?: string; readonly id?: bigint } }

type _D = { readonly text?: string }

const D: Schema.Schema<_D> = Schema.Struct({ text: Schema.optionalKey(Schema.String) })

export const Item: Schema.Schema<_Item> = Schema.Struct({
  detail: (() => {
    const M0 = Schema.suspend(() => D)
    const M1 = Schema.Struct({
      comment: Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed('N/A'))),
      id: Schema.optionalKey(
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
          .check(
            Schema.isBetweenBigInt({
              minimum: -9223372036854775808n,
              maximum: 9223372036854775807n,
            }),
          ),
      ),
    })
    const isAll = (input: unknown): input is typeof M0.Type & typeof M1.Type =>
      Schema.is(M0)(input) && Schema.is(M1)(input)
    return Schema.Unknown.pipe(
      Schema.decodeTo(Schema.declare(isAll), {
        decode: SchemaGetter.transformEffect((input) =>
          Effect.all([
            Schema.decodeUnknownEffect(M0)(input),
            Schema.decodeUnknownEffect(M1)(input),
          ]).pipe(
            Effect.mapError((error) => error.issue),
            Effect.flatMap((values) => {
              const merged = values.every(
                (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
              )
                ? Object.assign({}, ...values)
                : values[0]
              return isAll(merged)
                ? Effect.succeed(merged)
                : Effect.fail(new SchemaIssue.InvalidValue(undefined, merged))
            }),
          ),
        ),
        encode: SchemaGetter.passthrough({ strict: false }),
      }),
    )
  })(),
})

export type Item = typeof Item.Type
