import * as z from 'zod'

type _User = { name: string; address?: _Address }

type _Address = { street: string; city: string }

const Address: z.ZodType<_Address> = z.object({ street: z.string(), city: z.string() })

export const User: z.ZodType<_User> = z.object({
  name: z.string(),
  address: z.lazy(() => Address).exactOptional(),
})

export type User = z.infer<typeof User>
