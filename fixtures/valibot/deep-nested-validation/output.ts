import * as v from 'valibot'

export const User = v.object({
  name: v.pipe(v.string(), v.minCodePoints(1)),
  email: v.pipe(v.string(), v.email()),
  address: v.object({ city: v.string(), zip: v.pipe(v.string(), v.regex(/^\d{3}-\d{4}$/)) }),
})

export type UserOutput = v.InferOutput<typeof User>
