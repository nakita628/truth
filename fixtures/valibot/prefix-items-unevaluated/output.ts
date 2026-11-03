import * as v from 'valibot'

export const Row = v.tupleWithRest([v.string(), v.boolean()], v.pipe(v.number(), v.integer()))

export type RowOutput = v.InferOutput<typeof Row>
