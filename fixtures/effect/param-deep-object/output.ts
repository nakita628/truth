import { Schema, SchemaTransformation } from 'effect'

export const Filter = Schema.Unknown.pipe(
  Schema.decodeTo(
    Schema.Unknown,
    SchemaTransformation.transform<unknown, unknown>({
      decode: (input) => {
        if (typeof input !== 'object' || input === null || Array.isArray(input)) return input
        const out = Object.entries(input).reduce<{ [k: string]: unknown }>((acc, [key, value]) => {
          const name = /^[^[\]]+\[([^\]]+)\]$/u.exec(key)?.[1]
          return name === undefined ? acc : { ...acc, [name]: value }
        }, {})
        return Object.keys(out).length > 0 ? out : input
      },
      encode: (output) => output,
    }),
  ),
  Schema.decodeTo(
    Schema.Struct({
      age: Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)$/))
        .pipe(
          Schema.decodeTo(
            Schema.Finite,
            SchemaTransformation.transform({
              decode: (input) => Number(input),
              encode: (output) => String(output),
            }),
          ),
        )
        .check(Schema.isInt()),
      name: Schema.optionalKey(Schema.String),
    }),
  ),
)

export type Filter = typeof Filter.Type
