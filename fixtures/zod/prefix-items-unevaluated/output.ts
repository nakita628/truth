import * as z from 'zod'

export const Tuple = z.tuple([z.string(), z.boolean()], z.int())

export type Tuple = z.infer<typeof Tuple>
