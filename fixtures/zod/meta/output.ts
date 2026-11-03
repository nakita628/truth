import * as z from 'zod'

export const User = z
  .object({
    id: z.int().meta({ description: 'unique id', readOnly: true }),
    email: z.email().meta({ description: 'email address', examples: ['a@b.com', 'c@d.com'] }),
    role: z.string().meta({ description: 'legacy role', deprecated: true }).exactOptional(),
  })
  .meta({
    description: 'A user account',
    examples: [{ id: 1, email: 'a@b.com' }],
    externalDocs: { url: 'https://example.com/users' },
  })

export type User = z.infer<typeof User>
