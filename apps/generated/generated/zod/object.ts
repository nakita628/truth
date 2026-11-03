import * as z from 'zod'

export const Schema = z.object({
  first_name: z.string().exactOptional(),
  last_name: z.string().exactOptional(),
  birthday: z.iso.date().exactOptional(),
  address: z
    .object({
      street_address: z.string().exactOptional(),
      city: z.string().exactOptional(),
      state: z.string().exactOptional(),
      country: z.string().exactOptional(),
    })
    .exactOptional(),
})
