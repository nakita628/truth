import * as z from 'zod'

export const Code = z.object({
  code: z.string().length(6, { error: 'Code must be exactly 6 characters' }),
})

export type Code = z.infer<typeof Code>
