import * as v from 'valibot'

type _A = { b?: _B }

type _C = string

type _B = { c?: _C }

const C: v.GenericSchema<unknown, _C> = v.string()

const B: v.GenericSchema<unknown, _B> = v.partial(v.object({ c: v.lazy(() => C) }))

export const A: v.GenericSchema<unknown, _A> = v.partial(v.object({ b: v.lazy(() => B) }))
