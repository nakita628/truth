import * as v from 'valibot'

export const Address = v.pipe(
  v.looseObject({ country: v.string(), postalCode: v.optional(v.string()) }),
  v.check(
    (input) =>
      !v.safeParse(v.object({ country: v.literal('JP') }), input).success ||
      v.safeParse(v.object({ postalCode: v.pipe(v.string(), v.regex(/^\d{3}-\d{4}$/)) }), input)
        .success,
  ),
)

export type AddressOutput = v.InferOutput<typeof Address>
