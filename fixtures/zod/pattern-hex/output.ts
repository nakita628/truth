import * as z from 'zod'

export const Metadata = z.string().regex(/^[\x00-\uFFFF]*$/)

export type Metadata = z.infer<typeof Metadata>
