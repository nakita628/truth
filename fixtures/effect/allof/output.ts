import { Schema } from 'effect'

export const Combined = Schema.Struct({
  ...Schema.Struct({ name: Schema.String }).fields,
  ...Schema.Struct({ age: Schema.Number }).fields,
})

export type Combined = typeof Combined.Type
