import * as z from 'zod'

export const Ids = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return val
    const text = val
    return text === '' ? [] : text.split(',')
  },
  z.preprocess(
    (val) => (val === undefined || Array.isArray(val) ? val : [val]),
    z
      .array(
        z.preprocess(
          (val) => (typeof val === 'string' && /^-?(?:0|[1-9]\d*)$/.test(val) ? Number(val) : val),
          z.number().int(),
        ),
      )
      .min(1),
  ),
)

export type Ids = z.infer<typeof Ids>
