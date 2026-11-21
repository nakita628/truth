import * as v from 'valibot'

export const Schema = v.object({
  pair: v.pipe(v.array(v.string()), v.length(2)),
  range: v.optional(v.pipe(v.array(v.number()), v.minLength(1), v.maxLength(3))),
})

export type SchemaOutput = v.InferOutput<typeof Schema>
