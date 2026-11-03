import * as v from 'valibot'

export const Filter = v.pipe(
  v.unknown(),
  v.transform((input) => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) return input
    const out = Object.entries(input).reduce<{ [k: string]: unknown }>((acc, [key, value]) => {
      const name = /^[^[\]]+\[([^\]]+)\]$/u.exec(key)?.[1]
      return name === undefined ? acc : { ...acc, [name]: value }
    }, {})
    return Object.keys(out).length > 0 ? out : input
  }),
  v.object({
    age: v.pipe(
      v.string(),
      v.regex(/^-?(?:0|[1-9]\d*)$/),
      v.transform((input) => Number(input)),
      v.number(),
      v.safeInteger(),
    ),
    name: v.optional(v.string()),
  }),
)

export type FilterOutput = v.InferOutput<typeof Filter>
