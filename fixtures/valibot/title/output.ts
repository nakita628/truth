import * as v from 'valibot'

export const User = v.object({ name: v.string(), email: v.pipe(v.string(), v.email()) })

export type UserOutput = v.InferOutput<typeof User>
