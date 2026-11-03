import * as v from 'valibot'

export const Config = v.pipe(
  v.object({
    name: v.string(),
    tags: v.pipe(v.array(v.string()), v.readonly()),
    count: v.optional(v.pipe(v.number(), v.integer())),
  }),
  v.readonly(),
)

export type ConfigOutput = v.InferOutput<typeof Config>
