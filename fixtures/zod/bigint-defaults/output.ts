import * as z from 'zod'

type _Limits = {
  between?: bigint
  large?: bigint
  level?: 9007199254740992n | 2n
  big?: _Big
  maybe?: _Big | null
}

type _Big = bigint

const Big: z.ZodType<_Big> = z.bigint()

export const Limits: z.ZodType<_Limits> = z.object({
  between: z.bigint().min(BigInt(1)).gt(BigInt(5)).max(BigInt(10)).lt(BigInt(8)).exactOptional(),
  large: z
    .union([z.bigint(), z.number().int(), z.string().regex(/^-?\d+$/)])
    .transform((val) => BigInt(val))
    .pipe(z.int64())
    .default(9007199254740992n)
    .exactOptional(),
  level: z
    .union([z.bigint(), z.number().int(), z.string().regex(/^-?\d+$/)])
    .transform((val) => BigInt(val))
    .pipe(z.union([z.literal(9007199254740992n), z.literal(2n)]))
    .exactOptional(),
  big: z
    .lazy(() => Big)
    .default(BigInt(5))
    .exactOptional(),
  maybe: z
    .union([z.lazy(() => Big), z.null()])
    .default(BigInt(6))
    .exactOptional(),
})

export type Limits = z.infer<typeof Limits>
