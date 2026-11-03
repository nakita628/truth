import * as v from 'valibot'

export const Bounded = v.pipe(v.number(), v.integer(), v.minValue(5))

export type BoundedOutput = v.InferOutput<typeof Bounded>
