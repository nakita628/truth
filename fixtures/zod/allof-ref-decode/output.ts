import * as z from 'zod'

type _Item = { detail?: _D & { comment?: string; id?: bigint } }

type _D = { text?: string }

const D: z.ZodType<_D> = z.object({ text: z.string().exactOptional() })

export const Item: z.ZodType<_Item> = z.object({
  detail: z
    .intersection(
      z.lazy(() => D),
      z.object({
        comment: z.string().default('N/A').exactOptional(),
        id: z
          .union([z.bigint(), z.number().int(), z.string().regex(/^-?\d+$/)])
          .transform((val) => BigInt(val))
          .pipe(z.int64())
          .exactOptional(),
      }),
    )
    .exactOptional(),
})

export type Item = z.infer<typeof Item>
