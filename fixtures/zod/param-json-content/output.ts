import * as z from 'zod'

export const Payload = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return val
    try {
      return JSON.parse(val)
    } catch {
      return val
    }
  },
  z.object({ id: z.int(), tags: z.array(z.string()).exactOptional() }),
)

export type Payload = z.infer<typeof Payload>
