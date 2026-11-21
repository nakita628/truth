import { Schema } from 'effect'

export const Schema_ = Schema.Struct({
  finish_reason: Schema.NullOr(Schema.Literals(['stop', 'length'])),
  status: Schema.optionalKey(Schema.NullOr(Schema.Literals(['active', 'inactive']))),
})

export type Schema_ = typeof Schema_.Type
