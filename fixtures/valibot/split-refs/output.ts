import * as v from 'valibot'

export const User = v.object({
  name: v.string(),
  address: v.optional(
    v.object({ street: v.string(), city: v.string(), zip: v.optional(v.string()) }),
  ),
})

export type UserOutput = v.InferOutput<typeof User>
