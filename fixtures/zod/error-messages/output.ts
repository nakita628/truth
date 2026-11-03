import * as z from 'zod'

export const User = z.object({
  name: z
    .string({ error: 'Invalid name' })
    .regex(/^[a-zA-Z]+$/, { error: 'Only alphabetic characters' })
    .min(3, { error: 'Name too short' })
    .max(20, { error: 'Name too long' }),
  age: z
    .int({ error: 'Invalid age' })
    .min(0, { error: 'Age must be positive' })
    .max(120, { error: 'Age too large' })
    .multipleOf(1, { error: 'Age must be integer' }),
  tags: z
    .array(z.string())
    .min(1, { error: 'Need at least one tag' })
    .max(5, { error: 'Too many tags' }),
})

export type User = z.infer<typeof User>
