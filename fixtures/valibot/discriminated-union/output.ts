import * as v from 'valibot'

export const Pet = v.variant(
  'kind',
  [
    v.object({ kind: v.literal('cat'), indoor: v.boolean() }),
    v.object({ kind: v.literal('dog'), breed: v.string() }),
  ],
  'Must be a known pet kind',
)

export type PetOutput = v.InferOutput<typeof Pet>
