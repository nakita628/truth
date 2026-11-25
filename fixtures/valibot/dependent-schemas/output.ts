import * as v from 'valibot'

export const Toggle = v.pipe(
  v.looseObject({ kind: v.string(), feature: v.optional(v.string()) }),
  v.check(
    (input) => !Object.hasOwn(input, 'kind') || Object.hasOwn(input, 'feature'),
    'feature is required when kind is set',
  ),
)

export type ToggleOutput = v.InferOutput<typeof Toggle>
