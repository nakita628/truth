import * as z from 'zod'

export const Schema = z
  .looseObject({ a: z.number().exactOptional(), kind: z.string().exactOptional() })
  .refine((val) =>
    Object.keys(val).every(
      (key) =>
        ['a', 'kind'].includes(key) ||
        (z.object({ kind: z.literal('x'), flag: z.literal(true).exactOptional() }).safeParse(val)
          .success &&
          ['flag', 'x'].includes(key)) ||
        (!z.object({ kind: z.literal('x'), flag: z.literal(true).exactOptional() }).safeParse(val)
          .success &&
          ['y'].includes(key)) ||
        (Object.hasOwn(val, 'a') && ['b'].includes(key)) ||
        (Object.hasOwn(val, 'constructor') && ['c2'].includes(key)),
    ),
  )
  .refine(
    (val) => !('a' in val) || z.object({ b: z.number().exactOptional() }).safeParse(val).success,
  )
  .refine(
    (val) =>
      !('constructor' in val) ||
      z.object({ c2: z.number().exactOptional() }).safeParse(val).success,
  )
  .refine(
    (val) =>
      !z.object({ kind: z.literal('x'), flag: z.literal(true).exactOptional() }).safeParse(val)
        .success || z.object({ x: z.number().exactOptional() }).safeParse(val).success,
  )
  .refine(
    (val) =>
      z.object({ kind: z.literal('x'), flag: z.literal(true).exactOptional() }).safeParse(val)
        .success || z.object({ y: z.number().exactOptional() }).safeParse(val).success,
  )

export type Schema = z.infer<typeof Schema>
