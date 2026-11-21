import * as v from 'valibot'

export const Schema = v.object({
  finish_reason: v.nullable(v.picklist(['stop', 'length'])),
  status: v.optional(v.nullable(v.picklist(['active', 'inactive']))),
})

export type SchemaOutput = v.InferOutput<typeof Schema>
