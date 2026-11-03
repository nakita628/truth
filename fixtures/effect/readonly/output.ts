import { Schema } from 'effect'

export const Config = Schema.Struct({
  name: Schema.String,
  tags: Schema.Array(Schema.String),
  count: Schema.optionalKey(Schema.Number.check(Schema.isInt())),
})

export type Config = typeof Config.Type
