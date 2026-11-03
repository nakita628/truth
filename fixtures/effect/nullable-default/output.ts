import { Effect, Schema } from 'effect'

export const Profile = Schema.Struct({
  nickname: Schema.optionalKey(Schema.NullOr(Schema.String)),
  age: Schema.NullOr(Schema.Number.check(Schema.isInt())).pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
})

export type Profile = typeof Profile.Type
