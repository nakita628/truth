import { Schema, SchemaTransformation } from 'effect'

export const Ids = Schema.Unknown.pipe(
  Schema.decodeTo(
    Schema.Unknown,
    SchemaTransformation.transform<unknown, unknown>({
      decode: (input) => {
        if (typeof input !== 'string') return input
        const text = input
        return text === '' ? [] : text.split(',')
      },
      encode: (output) => output,
    }),
  ),
  Schema.decodeTo(
    Schema.Unknown.pipe(
      Schema.decodeTo(
        Schema.Unknown,
        SchemaTransformation.transform<unknown, unknown>({
          decode: (input) => (input === undefined || Array.isArray(input) ? input : [input]),
          encode: (output) => output,
        }),
      ),
      Schema.decodeTo(
        Schema.Array(
          Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)$/))
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
        ).check(Schema.isMinLength(1)),
      ),
    ),
  ),
)

export type Ids = typeof Ids.Type
