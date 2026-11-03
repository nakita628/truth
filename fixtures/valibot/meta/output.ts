import * as v from 'valibot'

export const User = v.pipe(
  v.object({
    id: v.pipe(
      v.pipe(v.number(), v.integer()),
      v.description('unique id'),
      v.metadata({ readOnly: true }),
    ),
    email: v.pipe(
      v.pipe(v.string(), v.email()),
      v.description('email address'),
      v.metadata({ examples: ['a@b.com', 'c@d.com'] }),
    ),
    role: v.optional(
      v.pipe(v.string(), v.description('legacy role'), v.metadata({ deprecated: true })),
    ),
  }),
  v.description('A user account'),
  v.metadata({
    examples: [{ id: 1, email: 'a@b.com' }],
    externalDocs: { url: 'https://example.com/users' },
  }),
)

export type UserOutput = v.InferOutput<typeof User>
