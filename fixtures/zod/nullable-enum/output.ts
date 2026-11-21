import * as z from 'zod'

export const Schema = z.object({
  finish_reason: z.enum(['stop', 'length']).nullable(),
  status: z.enum(['active', 'inactive']).nullable().exactOptional(),
})

export type Schema = z.infer<typeof Schema>
