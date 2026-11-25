import * as z from 'zod'

export const Schema = z
  .looseObject({ a: z.number().exactOptional(), kind: z.string().exactOptional() })
  .refine((val) =>
    ((__ifPassed) =>
      Object.keys(val).every(
        (key) =>
          ['a', 'kind'].includes(key) ||
          (__ifPassed && ['flag', 'x'].includes(key)) ||
          (!__ifPassed && ['y'].includes(key)) ||
          (Object.hasOwn(val, 'a') && ['b'].includes(key)) ||
          (Object.hasOwn(val, 'constructor') && ['c2'].includes(key)),
      ))(
      z.object({ kind: z.literal('x'), flag: z.literal(true).exactOptional() }).safeParse(val)
        .success,
    ),
  )
  .refine(
    (val) =>
      !Object.hasOwn(val, 'a') ||
      z.object({ b: z.number().exactOptional() }).safeParse(val).success,
  )
  .refine(
    (val) =>
      !Object.hasOwn(val, 'constructor') ||
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
