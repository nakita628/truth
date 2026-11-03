import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  email: Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
})

export type User = typeof User.Type
