import * as z from 'zod'

export const StyleBag = z.object({ style: z.string().exactOptional() })

export type StyleBag = z.infer<typeof StyleBag>
