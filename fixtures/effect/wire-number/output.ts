import { Schema, SchemaTransformation } from 'effect'

export const Query = Schema.Struct({
  ratio: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/)).pipe(
      Schema.decodeTo(
        Schema.Finite,
        SchemaTransformation.transform({
          decode: (input) => Number(input),
          encode: (output) => String(output),
        }),
      ),
    ),
  ),
  score: Schema.optionalKey(
    Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/))
      .pipe(
        Schema.decodeTo(
          Schema.Finite,
          SchemaTransformation.transform({
            decode: (input) => Number(input),
            encode: (output) => String(output),
          }),
        ),
      )
      .check(Schema.isGreaterThanOrEqualTo(1)),
  ),
  id: Schema.optionalKey(
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
  ),
  count: Schema.optionalKey(
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
      .check(Schema.isInt(), Schema.isLessThanOrEqualTo(9007199254740991)),
  ),
})

export type Query = typeof Query.Type
