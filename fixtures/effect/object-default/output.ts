import { Effect, Schema } from 'effect'

export const Filters = Schema.Struct({
  active: Schema.optionalKey(Schema.Boolean),
  fetch_connection_secrets: Schema.optionalKey(Schema.Boolean),
}).pipe(Schema.withDecodingDefault(Effect.succeed({ fetch_connection_secrets: false })))

export type Filters = typeof Filters.Type
