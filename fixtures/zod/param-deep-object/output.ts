import * as z from 'zod'

export const Filter = z.preprocess(
  (val) => {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) return val
    const out = Object.entries(val).reduce<{ [k: string]: unknown }>((acc, [key, value]) => {
      const name = /^[^[\]]+\[([^\]]+)\]$/u.exec(key)?.[1]
      return name === undefined ? acc : { ...acc, [name]: value }
    }, {})
    return Object.keys(out).length > 0 ? out : val
  },
  z.object({
    age: z
      .string()
      .regex(/^-?(?:0|[1-9]\d*)$/)
      .transform((val) => Number(val))
      .pipe(z.number().int()),
    name: z.string().exactOptional(),
  }),
)

export type Filter = z.infer<typeof Filter>
