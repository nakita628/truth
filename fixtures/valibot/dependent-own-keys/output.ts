import * as v from 'valibot'

export const OwnKeys = v.partial(
  v.object({
    dep: v.pipe(
      v.partial(v.looseObject({ a: v.string() })),
      v.check((input) => !Object.hasOwn(input, "it's") || Object.hasOwn(input, 'back\\slash')),
      v.check(
        (input) =>
          !Object.hasOwn(input, 'toString') ||
          v.safeParse(v.object({ x: v.pipe(v.number(), v.integer()) }), input).success,
      ),
    ),
    req: v.pipe(
      v.looseObject({}),
      v.check((input) => ['toString'].every((key) => Object.hasOwn(input, key))),
    ),
  }),
)

export type OwnKeysOutput = v.InferOutput<typeof OwnKeys>
