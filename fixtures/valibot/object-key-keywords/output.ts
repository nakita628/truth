import * as v from 'valibot'

export const KeyChecks = v.partial(
  v.object({
    counted: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) => Object.keys(input).length >= 2),
    ),
    loose: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) => Object.keys(input).length <= 1),
    ),
    dep: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) => !Object.hasOwn(input, 'a') || Object.hasOwn(input, 'b')),
    ),
    open: v.looseObject({}),
  }),
)

export type KeyChecksOutput = v.InferOutput<typeof KeyChecks>
