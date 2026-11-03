import { Schema, SchemaTransformation } from 'effect'

export const Payload = Schema.Unknown.pipe(
  Schema.decodeTo(
    Schema.Unknown,
    SchemaTransformation.transform<unknown, unknown>({
      decode: (input) => {
        if (typeof input !== 'string') return input
        try {
          return JSON.parse(input)
        } catch {
          return input
        }
      },
      encode: (output) => output,
    }),
  ),
  Schema.decodeTo(
    Schema.Struct({
      id: Schema.Number.check(Schema.isInt()),
      tags: Schema.optionalKey(Schema.Array(Schema.String)),
    }),
  ),
)

export type Payload = typeof Payload.Type
