import * as v from 'valibot'

export const Schema = v.object({
  review_target: v.optional(
    v.union([
      v.pipe(
        v.string(),
        v.minCodePoints(1),
        v.maxCodePoints(96),
        v.check((input) => !v.safeParse(v.any(), input).success),
      ),
      v.null(),
    ]),
  ),
  id: v.pipe(
    v.nullable(v.string()),
    v.check((input) => !['root'].some((item) => item === input)),
  ),
})

export type SchemaOutput = v.InferOutput<typeof Schema>
