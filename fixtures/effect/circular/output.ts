import { Schema } from 'effect'

type _A = { readonly b?: _B }

type _B = { readonly a?: _A }

const B: Schema.Schema<_B> = Schema.Struct({ a: Schema.optionalKey(Schema.suspend(() => A)) })

export const A: Schema.Schema<_A> = Schema.Struct({
  b: Schema.optionalKey(Schema.suspend(() => B)),
})

export type A = typeof A.Type
