import * as z from 'zod'

export const Query = z.object({
  ratio: z
    .preprocess(
      (val) =>
        typeof val === 'string' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(val)
          ? Number(val)
          : val,
      z.number(),
    )
    .exactOptional(),
  score: z
    .preprocess(
      (val) =>
        typeof val === 'string' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(val)
          ? Number(val)
          : val,
      z.number().min(1),
    )
    .exactOptional(),
  id: z
    .preprocess(
      (val) => (typeof val === 'string' && /^-?(?:0|[1-9]\d*)$/.test(val) ? Number(val) : val),
      z.number().int(),
    )
    .exactOptional(),
  count: z
    .preprocess(
      (val) => (typeof val === 'string' && /^-?(?:0|[1-9]\d*)$/.test(val) ? Number(val) : val),
      z.number().int().max(9007199254740991),
    )
    .exactOptional(),
})

export type Query = z.infer<typeof Query>
