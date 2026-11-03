import * as z from 'zod'

export const Config = z
  .object({
    name: z.string(),
    tags: z.array(z.string()).readonly(),
    count: z.int().exactOptional(),
  })
  .readonly()

export type Config = z.infer<typeof Config>
