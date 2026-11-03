import * as z from 'zod'

export const Bounded = z.int().min(5)

export type Bounded = z.infer<typeof Bounded>
