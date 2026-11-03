import { Schema } from 'effect'

type _A = { readonly b?: _B }

type _C = string

type _B = { readonly c?: _C }

const C: Schema.Schema<_C> = Schema.String

const B: Schema.Schema<_B> = Schema.Struct({ c: Schema.optionalKey(Schema.suspend(() => C)) })

export const A: Schema.Schema<_A> = Schema.Struct({
  b: Schema.optionalKey(Schema.suspend(() => B)),
})

export type A = typeof A.Type
