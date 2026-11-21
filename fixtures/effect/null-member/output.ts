import { Schema } from 'effect'

export const Schema_ = Schema.Struct({
  name: Schema.Union([Schema.String, Schema.Null]),
  count: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
      Schema.Null,
    ]),
  ),
})

export type Schema_ = typeof Schema_.Type
