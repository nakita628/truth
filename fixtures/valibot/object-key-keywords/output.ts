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
    strings: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) => Object.keys(input).length >= 1),
      v.check((input) =>
        Object.values(input).every((value) => v.safeParse(v.string(), value).success),
      ),
    ),
    letters: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) =>
        Object.entries(input).every(
          ([key, value]) =>
            !new RegExp('^\\p{L}+$', 'u').test(key) || v.safeParse(v.string(), value).success,
        ),
      ),
      v.check((input) => Object.keys(input).every((key) => new RegExp('^\\p{L}+$', 'u').test(key))),
    ),
  }),
)

export type KeyChecksOutput = v.InferOutput<typeof KeyChecks>
