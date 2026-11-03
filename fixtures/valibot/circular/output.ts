import * as v from 'valibot'

type _A = { b?: _B }

type _B = { a?: _A }

const B: v.GenericSchema<unknown, _B> = v.partial(v.object({ a: v.lazy(() => A) }))

export const A: v.GenericSchema<unknown, _A> = v.partial(v.object({ b: v.lazy(() => B) }))

export type AOutput = v.InferOutput<typeof A>
