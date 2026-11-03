import * as z from 'zod'

export const ImageBag = z.object({ image: z.string().exactOptional() })

export type ImageBag = z.infer<typeof ImageBag>
