import * as v from 'valibot'

type _User = { name: string; address?: _Address }

type _Address = { street: string; city: string }

const Address: v.GenericSchema<unknown, _Address> = v.object({
  street: v.string(),
  city: v.string(),
})

export const User: v.GenericSchema<unknown, _User> = v.object({
  name: v.string(),
  address: v.optional(v.lazy(() => Address)),
})

export type UserOutput = v.InferOutput<typeof User>
