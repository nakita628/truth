import { Schema } from 'effect'

export const Schema_ = Schema.Struct({
  name: Schema.String,
  age: Schema.optionalKey(Schema.Number),
})

export type Schema_ = typeof Schema_.Type
