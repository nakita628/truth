import * as z from 'zod'

export const User = z.strictObject({
  id: z.uuid().meta({ description: 'Unique identifier for the user' }),
  name: z.string().min(1).meta({ description: 'Name of the user' }),
  age: z.int().min(0).meta({ description: 'Age of the user' }).exactOptional(),
  email: z.email().meta({ description: 'Email address' }),
  isActive: z
    .boolean()
    .default(true)
    .meta({ description: 'Whether the user is active' })
    .exactOptional(),
})
