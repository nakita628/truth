import * as z from 'zod'

type _Schema = { children?: z.infer<typeof Schema>[] }

export const Schema: z.ZodType<_Schema> = z.object({
  children: z.array(z.lazy(() => Schema)).exactOptional(),
})

export type Schema = z.infer<typeof Schema>
