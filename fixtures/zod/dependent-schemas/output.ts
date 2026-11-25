import * as z from 'zod'

export const DependentRequired = z
  .looseObject({ kind: z.string().exactOptional(), feature: z.string().exactOptional() })
  .refine((val) => !Object.hasOwn(val, 'kind') || Object.hasOwn(val, 'feature'))

export type DependentRequired = z.infer<typeof DependentRequired>
