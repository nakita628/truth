import { Effect, Schema, SchemaGetter, SchemaIssue } from 'effect'

type _A = { readonly id: string; readonly type: 'B' | 'C'; readonly payload: _B | _C }

type _E = {
  readonly label?: string
  readonly reference?: _E
  readonly flags?: readonly string[]
  readonly meta?: { [key: string]: string }
}

type _D = { readonly score: number; readonly extra?: null | _E }

type _B = {
  readonly type: 'B'
  readonly name: string
  readonly detail: _D & { readonly comment?: string }
}

type _C = { readonly type: 'C'; readonly entries: readonly _E[] }

const E: Schema.Schema<_E> = Schema.Struct({
  label: Schema.optional(Schema.String),
  reference: Schema.optional(Schema.suspend(() => E)),
  flags: Schema.optional(Schema.Array(Schema.String).check(Schema.isUnique())),
  meta: Schema.optional(Schema.Record(Schema.String, Schema.String)),
})

const D: Schema.Schema<_D> = Schema.Struct({
  score: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(100),
  ).pipe(Schema.withDecodingDefault(Effect.succeed(50))),
  extra: Schema.optional(Schema.Union([Schema.NullOr(Schema.Null), Schema.suspend(() => E)])),
})

const B: Schema.Schema<_B> = Schema.Struct({
  type: Schema.Literal('B'),
  name: Schema.String,
  detail: (() => {
    const M0 = Schema.suspend(() => D)
    const M1 = Schema.Struct({
      comment: Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed('N/A'))),
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

const C: Schema.Schema<_C> = Schema.Struct({
  type: Schema.Literal('C'),
  entries: Schema.Array(Schema.suspend(() => E)).check(Schema.isMinLength(1)),
})

export const A: Schema.Schema<_A> = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()),
  type: Schema.Literals(['B', 'C']),
  payload: Schema.Union([Schema.suspend(() => B), Schema.suspend(() => C)]),
})
