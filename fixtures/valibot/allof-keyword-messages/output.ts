import * as v from 'valibot'

export const Messaged = v.partial(
  v.object({
    n: v.pipe(
      v.any(),
      v.check((input) => typeof input !== 'number' || input >= 5, 'low'),
      v.check((input) => typeof input !== 'number' || input <= 9, 'high'),
    ),
  }),
)

export type MessagedOutput = v.InferOutput<typeof Messaged>
