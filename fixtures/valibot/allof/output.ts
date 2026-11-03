import * as v from 'valibot'

export const Combined = v.intersect([v.object({ name: v.string() }), v.object({ age: v.number() })])

export type CombinedOutput = v.InferOutput<typeof Combined>
