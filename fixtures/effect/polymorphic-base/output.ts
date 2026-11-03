import { Effect, Schema, SchemaGetter, SchemaIssue } from 'effect'

type _Connections = readonly _Connection[]

type _ConnectionBase = { readonly name?: string; readonly type?: 'Sample' | 'Kafka' }

type _KafkaConnection = _ConnectionBase & { readonly bootstrapServers?: string }

type _SampleConnection = _ConnectionBase

type _Connection = _SampleConnection | _KafkaConnection

const ConnectionBase: Schema.Schema<_ConnectionBase> = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
  type: Schema.optionalKey(Schema.Literals(['Sample', 'Kafka'])),
})

const KafkaConnection: Schema.Schema<_KafkaConnection> = (() => {
  const M0 = Schema.suspend(() => ConnectionBase)
  const M1 = Schema.Struct({ bootstrapServers: Schema.optionalKey(Schema.String) })
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
})()

const SampleConnection: Schema.Schema<_SampleConnection> = Schema.suspend(() => ConnectionBase)

const Connection: Schema.Schema<_Connection> = Schema.Union([
  (() => {
    const M0 = Schema.suspend(() => SampleConnection)
    const M1 = Schema.Struct({ type: Schema.Literal('Sample') })
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
  (() => {
    const M0 = Schema.suspend(() => KafkaConnection)
    const M1 = Schema.Struct({ type: Schema.Literal('Kafka') })
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
])

export const Connections: Schema.Schema<_Connections> = Schema.Array(
  Schema.suspend(() => Connection),
)

export type Connections = typeof Connections.Type
