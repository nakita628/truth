import * as z from 'zod'

export const Account = z.object({
  name: z.string().exactOptional(),
  password: z.string().meta({ writeOnly: true }).exactOptional(),
})

export type Account = z.infer<typeof Account>
