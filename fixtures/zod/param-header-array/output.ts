import * as z from 'zod'

export const Headers = z.object({
  'x-ids': z
    .preprocess(
      (val) => {
        if (typeof val !== 'string') return val
        const text = val
        return text === '' ? [] : text.split(',')
      },
      z.preprocess(
        (val) => (val === undefined || Array.isArray(val) ? val : [val]),
        z.array(
          z
            .string()
            .regex(/^-?(?:0|[1-9]\d*)$/)
            .transform((val) => Number(val))
            .pipe(z.number().int()),
        ),
      ),
    )
    .exactOptional(),
})

export type Headers = z.infer<typeof Headers>
