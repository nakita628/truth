import * as v from 'valibot'

export const Filters = v.optional(
  v.partial(v.object({ active: v.boolean(), fetch_connection_secrets: v.boolean() })),
  { fetch_connection_secrets: false },
)

export type FiltersOutput = v.InferOutput<typeof Filters>
