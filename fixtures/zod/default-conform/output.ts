import * as z from 'zod'

type _Settings = {
  precision?: _Precision
  mode?: _Mode
  fallbackMode?: _Mode
  ratio?: number
  count?: number | null
  attachments?: 'cover' | boolean
}

type _Mode = 'coerce' | 'ignore_malformed' | 'strict'

type _Precision = number

const Mode: z.ZodType<_Mode> = z.enum(['coerce', 'ignore_malformed', 'strict'])

const Precision: z.ZodType<_Precision> = z.number()

export const Settings: z.ZodType<_Settings> = z.object({
  precision: z
    .lazy(() => Precision)
    .default(7)
    .exactOptional(),
  mode: z.lazy(() => Mode).exactOptional(),
  fallbackMode: z
    .lazy(() => Mode)
    .default('coerce')
    .exactOptional(),
  ratio: z.number().default(0.5).exactOptional(),
  count: z.int().nullable().exactOptional(),
  attachments: z
    .xor([z.literal('cover'), z.boolean()])
    .default(false)
    .exactOptional(),
})

export type Settings = z.infer<typeof Settings>
