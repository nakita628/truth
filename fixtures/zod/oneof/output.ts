import * as z from 'zod'

export const Shape = z.discriminatedUnion(
  'kind',
  [
    z.object({ kind: z.literal('circle'), radius: z.number() }),
    z.object({ kind: z.literal('rectangle'), width: z.number(), height: z.number() }),
  ],
  { error: 'Must be a valid shape' },
)

export type Shape = z.infer<typeof Shape>
