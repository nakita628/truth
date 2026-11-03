import { Schema } from 'effect'

export const Event = Schema.Union([
  Schema.Struct({
    type: Schema.Literal('click'),
    x: Schema.Number.check(Schema.isInt()),
    y: Schema.Number.check(Schema.isInt()),
  }),
  Schema.Struct({ type: Schema.Literal('keypress'), key: Schema.String }),
])

export type Event = typeof Event.Type
