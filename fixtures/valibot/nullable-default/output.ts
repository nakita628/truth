import * as v from 'valibot'

export const Status = v.object({ label: v.optional(v.nullable(v.string()), 'unknown') })

export type StatusOutput = v.InferOutput<typeof Status>
