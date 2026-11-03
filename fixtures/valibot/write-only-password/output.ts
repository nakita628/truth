import * as v from 'valibot'

export const Account = v.object({
  name: v.string(),
  password: v.pipe(v.string(), v.metadata({ writeOnly: true })),
})

export type AccountOutput = v.InferOutput<typeof Account>
