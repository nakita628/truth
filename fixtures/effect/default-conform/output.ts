import { Effect, Schema } from 'effect'

type _Settings = {
  readonly precision?: _Precision
  readonly mode?: _Mode
  readonly fallbackMode?: _Mode
  readonly ratio?: number
  readonly count?: number | null
  readonly attachments?: 'cover' | boolean
}

type _Mode = 'coerce' | 'ignore_malformed' | 'strict'

type _Precision = number

const Mode: Schema.Schema<_Mode> = Schema.Literals(['coerce', 'ignore_malformed', 'strict'])

const Precision: Schema.Schema<_Precision> = Schema.Number

export const Settings: Schema.Schema<_Settings> = Schema.Struct({
  precision: Schema.suspend(() => Precision).pipe(Schema.withDecodingDefault(Effect.succeed(7))),
  mode: Schema.optionalKey(Schema.suspend(() => Mode)),
  fallbackMode: Schema.suspend(() => Mode).pipe(
    Schema.withDecodingDefault(Effect.succeed('coerce')),
  ),
  ratio: Schema.Number.pipe(Schema.withDecodingDefault(Effect.succeed(0.5))),
  count: Schema.optionalKey(Schema.NullOr(Schema.Number.check(Schema.isInt()))),
  attachments: Schema.Union([Schema.Literal('cover'), Schema.Boolean]).pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
})

export type Settings = typeof Settings.Type
