import { Effect, Schema } from 'effect'

export const User = Schema.StructWithRest(
  Schema.Struct({
    id: Schema.String.check(Schema.isUUID()).annotate({
      description: 'Unique identifier for the user',
    }),
    name: Schema.String.check(
      Schema.makeFilter((input) => [...input].length >= 1, {
        expected: 'a string of at least 1 character',
      }),
    ).annotate({ description: 'Name of the user' }),
    age: Schema.optional(
      Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)).annotate({
        description: 'Age of the user',
      }),
    ),
    email: Schema.String.check(
      Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
    ).annotate({ description: 'Email address' }),
    isActive: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))).annotate({
      description: 'Whether the user is active',
    }),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).check(
  Schema.makeFilter((input) =>
    Object.keys(input).every((key) => ['id', 'name', 'age', 'email', 'isActive'].includes(key)),
  ),
)
