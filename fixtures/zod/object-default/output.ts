import * as z from 'zod'

export const Filters = z
  .object({
    active: z.boolean().exactOptional(),
    fetch_connection_secrets: z.boolean().exactOptional(),
  })
  .default({ fetch_connection_secrets: false })

export type Filters = z.infer<typeof Filters>
