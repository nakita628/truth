import * as z from 'zod'

export const Query = z.preprocess(
  (val) =>
    typeof val === 'object' && val !== null && !Array.isArray(val)
      ? Object.assign(Object.create(null), val)
      : val,
  z.object({
    page: z
      .string()
      .regex(/^-?(?:0|[1-9]\d*)$/)
      .transform((val) => Number(val))
      .pipe(z.number().int().min(1))
      .default(1),
    ids: z
      .preprocess(
        (val) => (val === undefined || Array.isArray(val) ? val : [val]),
        z.array(
          z
            .string()
            .regex(/^-?(?:0|[1-9]\d*)$/)
            .transform((val) => Number(val))
            .pipe(z.number().int()),
        ),
      )
      .exactOptional(),
    sort: z
      .string()
      .regex(/^-?(?:0|[1-9]\d*)$/)
      .transform((val) => Number(val))
      .pipe(z.union([z.literal(1), z.literal(-1)]))
      .exactOptional(),
    active: z.stringbool().pipe(z.literal(true)).exactOptional(),
    limit: z
      .preprocess(
        (val) => (val === 'null' ? null : val),
        z
          .string()
          .regex(/^-?(?:0|[1-9]\d*)$/)
          .transform((val) => Number(val))
          .pipe(z.number().int())
          .nullable(),
      )
      .exactOptional(),
    cursor: z.coerce.bigint().pipe(z.uint64()).exactOptional(),
    offset: z
      .string()
      .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/)
      .transform((val) => Number(val))
      .pipe(z.number().min(0))
      .exactOptional(),
    skip: z
      .string()
      .regex(/^-?(?:0|[1-9]\d*)$/)
      .transform((val) => Number(val))
      .pipe(z.number().int())
      .refine((val) => val !== 0)
      .exactOptional(),
    flag: z
      .union([
        z
          .string()
          .regex(/^-?(?:0|[1-9]\d*)$/)
          .transform((val) => Number(val))
          .pipe(z.number().int()),
        z.stringbool(),
      ])
      .exactOptional(),
    constructor: z
      .string()
      .regex(/^-?(?:0|[1-9]\d*)$/)
      .transform((val) => Number(val))
      .pipe(z.number().int())
      .exactOptional(),
    email: z.string().trim().pipe(z.email()).exactOptional(),
  }),
)

export type Query = z.infer<typeof Query>
