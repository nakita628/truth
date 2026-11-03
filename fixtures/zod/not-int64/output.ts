import * as z from 'zod'

export const Amount = z
  .union([z.bigint(), z.number().int(), z.string().regex(/^-?\d+$/)])
  .transform((val) => BigInt(val))
  .pipe(z.int64())
  .refine((val) => ![0n].includes(val))

export type Amount = z.infer<typeof Amount>
