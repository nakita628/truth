import * as z from 'zod'

export const User = z.object({ name: z.string(), email: z.email() })

export type User = z.infer<typeof User>
