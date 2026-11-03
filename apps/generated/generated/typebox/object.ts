import { Type, type Static } from 'typebox'

export const Schema = Type.Object({
  first_name: Type.Optional(Type.String()),
  last_name: Type.Optional(Type.String()),
  birthday: Type.Optional(Type.String({ format: 'date' })),
  address: Type.Optional(
    Type.Object({
      street_address: Type.Optional(Type.String()),
      city: Type.Optional(Type.String()),
      state: Type.Optional(Type.String()),
      country: Type.Optional(Type.String()),
    }),
  ),
})
