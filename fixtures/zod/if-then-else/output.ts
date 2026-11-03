import * as z from 'zod'

export const Address = z
  .looseObject({ country: z.string().exactOptional() })
  .refine(
    (val) =>
      !z.object({ country: z.literal('JP').exactOptional() }).safeParse(val).success ||
      z.object({ postalCode: z.string().regex(/^[0-9]{3}-[0-9]{4}$/) }).safeParse(val).success,
  )

export type Address = z.infer<typeof Address>
