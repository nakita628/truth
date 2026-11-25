import * as z from 'zod'

export const Schema = z
  .looseObject({ a: z.number().exactOptional(), kind: z.string().exactOptional() })
  .refine((val) => Object.keys(val).every((key) => ['a', 'kind', 'x', 'y', 'b'].includes(key)))
  .refine(
    (val) => !('a' in val) || z.object({ b: z.number().exactOptional() }).safeParse(val).success,
  )
  .refine(
    (val) =>
      !z.object({ kind: z.literal('x') }).safeParse(val).success ||
      z.object({ x: z.number().exactOptional() }).safeParse(val).success,
  )
  .refine(
    (val) =>
      z.object({ kind: z.literal('x') }).safeParse(val).success ||
      z.object({ y: z.number().exactOptional() }).safeParse(val).success,
  )

export type Schema = z.infer<typeof Schema>
