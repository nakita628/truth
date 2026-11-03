import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  address: Schema.optionalKey(
    Schema.Struct({
      street: Schema.String,
      city: Schema.String,
      zip: Schema.optionalKey(Schema.String),
    }),
  ),
})

export type User = typeof User.Type
