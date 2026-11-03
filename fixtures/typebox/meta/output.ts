import { Type, type Static } from 'typebox'

export const User = Type.Object(
  {
    id: Type.Integer({ description: 'unique id', readOnly: true }),
    email: Type.String({
      format: 'email',
      description: 'email address',
      examples: ['a@b.com', 'c@d.com'],
    }),
    role: Type.Optional(Type.String({ description: 'legacy role', deprecated: true })),
  },
  {
    description: 'A user account',
    examples: [{ id: 1, email: 'a@b.com' }],
    externalDocs: { url: 'https://example.com/users' },
  },
)

export type User = Static<typeof User>
