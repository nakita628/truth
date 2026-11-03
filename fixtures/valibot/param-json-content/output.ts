import * as v from 'valibot'

export const Payload = v.pipe(
  v.unknown(),
  v.transform((input) => {
    if (typeof input !== 'string') return input
    try {
      return JSON.parse(input)
    } catch {
      return input
    }
  }),
  v.object({ id: v.pipe(v.number(), v.integer()), tags: v.optional(v.array(v.string())) }),
)

export type PayloadOutput = v.InferOutput<typeof Payload>
