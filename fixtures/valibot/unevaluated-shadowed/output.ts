import * as v from 'valibot'

export const Shadowed = v.partial(
  v.object({
    typed: v.pipe(
      v.partial(v.looseObject({ a: v.string() })),
      v.check((input) =>
        Object.entries(input).every(
          ([key, value]) => ['a'].includes(key) || v.safeParse(v.string(), value).success,
        ),
      ),
    ),
    open: v.partial(v.looseObject({ a: v.string() })),
  }),
)

export type ShadowedOutput = v.InferOutput<typeof Shadowed>
