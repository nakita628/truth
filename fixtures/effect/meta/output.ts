import { Schema } from 'effect'

export const User = Schema.Struct({
  id: Schema.Number.check(Schema.isInt()).annotate({ description: 'unique id', readOnly: true }),
  email: Schema.String.check(
    Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
  ).annotate({ description: 'email address', jsonSchemaExamples: ['a@b.com', 'c@d.com'] }),
  role: Schema.optionalKey(
    Schema.String.annotate({ description: 'legacy role', jsonSchemaDeprecated: true }),
  ),
}).annotate({
  description: 'A user account',
  jsonSchemaExamples: [{ id: 1, email: 'a@b.com' }],
  jsonSchemaExternalDocs: { url: 'https://example.com/users' },
})

export type User = typeof User.Type
