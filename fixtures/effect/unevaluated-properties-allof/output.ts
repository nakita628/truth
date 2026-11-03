import { Effect, Schema, SchemaGetter, SchemaIssue } from 'effect'

type _Bucket = _Base & { readonly doc_count: number }

type _Base = { readonly meta?: string }

const Base: Schema.Schema<_Base> = Schema.Struct({ meta: Schema.optionalKey(Schema.String) })

export const Bucket: Schema.Schema<_Bucket> = Schema.Unknown.check(
  Schema.makeFilter(
    (input) =>
      typeof input !== 'object' ||
      input === null ||
      Array.isArray(input) ||
      Object.entries(input).every(
        ([k, v]) =>
          ['meta', 'doc_count'].includes(k) ||
          Schema.is(Schema.toEncoded(Schema.suspend(() => Base)))(v),
      ),
  ),
).pipe(
  Schema.decodeTo(
    (() => {
      const M0 = Schema.suspend(() => Base)
      const M1 = Schema.Struct({ doc_count: Schema.Number.check(Schema.isInt()) })
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
  ),
)

export type Bucket = typeof Bucket.Type
