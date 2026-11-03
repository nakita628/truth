import * as z from 'zod'

export const Schema = z.object({ name: z.string(), age: z.number().exactOptional() })

export type Schema = z.infer<typeof Schema>
