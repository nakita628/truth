import { Schema } from 'effect'

type _Schema_ = { readonly children?: readonly (typeof Schema_.Type)[] }

export const Schema_: Schema.Schema<_Schema_> = Schema.Struct({
  children: Schema.optionalKey(Schema.Array(Schema.suspend(() => Schema_))),
})

export type Schema_ = typeof Schema_.Type
