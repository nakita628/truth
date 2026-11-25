import * as z from 'zod'

export const OwnKeys = z.object({
  dep: z
    .looseObject({ a: z.string().exactOptional() })
    .refine((val) => !Object.hasOwn(val, "it's") || Object.hasOwn(val, 'back\\slash'))
    .refine(
      (val) => !Object.hasOwn(val, 'toString') || z.object({ x: z.int() }).safeParse(val).success,
    )
    .exactOptional(),
  req: z
    .looseObject({})
    .refine((val) => ['toString'].every((key) => Object.hasOwn(val, key)))
    .exactOptional(),
})

export type OwnKeys = z.infer<typeof OwnKeys>
