import { Schema } from 'effect'

type _User = { readonly name: string; readonly address?: _Address }

type _Address = { readonly street: string; readonly city: string }

const Address: Schema.Schema<_Address> = Schema.Struct({
  street: Schema.String,
  city: Schema.String,
})

export const User: Schema.Schema<_User> = Schema.Struct({
  name: Schema.String,
  address: Schema.optionalKey(Schema.suspend(() => Address)),
})

export type User = typeof User.Type
