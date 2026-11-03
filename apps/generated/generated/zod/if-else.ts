import * as z from 'zod'

export const Vehicle = z
  .looseObject({ type: z.enum(['car', 'truck']) })
  .refine(
    (val) =>
      !z.object({ type: z.literal('truck').exactOptional() }).safeParse(val).success ||
      z.object({ cargoCapacity: z.number().min(0) }).safeParse(val).success,
  )
  .refine(
    (val) =>
      z.object({ type: z.literal('truck').exactOptional() }).safeParse(val).success ||
      z.object({ passengerCount: z.int().min(1) }).safeParse(val).success,
  )
