import * as v from 'valibot'

export const Schema = v.object({
  name: v.union([v.string(), v.null()]),
  count: v.optional(v.union([v.pipe(v.number(), v.integer(), v.minValue(0)), v.null()])),
})

export type SchemaOutput = v.InferOutput<typeof Schema>
