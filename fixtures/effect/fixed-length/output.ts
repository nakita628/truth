import { Schema } from 'effect'

export const Schema_ = Schema.Struct({
  pair: Schema.Array(Schema.String).check(Schema.isBetweenLength(2, 2)),
  range: Schema.optionalKey(
    Schema.Array(Schema.Number).check(Schema.isMinLength(1), Schema.isMaxLength(3)),
  ),
})

export type Schema_ = typeof Schema_.Type
