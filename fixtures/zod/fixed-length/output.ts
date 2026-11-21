import * as z from 'zod'

export const Schema = z.object({
  pair: z.array(z.string()).length(2),
  range: z.array(z.number()).min(1).max(3).exactOptional(),
})

export type Schema = z.infer<typeof Schema>
