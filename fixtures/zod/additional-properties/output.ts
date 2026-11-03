import * as z from 'zod'

export const Config = z.record(z.string(), z.string())

export type Config = z.infer<typeof Config>
