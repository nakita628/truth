import * as v from 'valibot'

export const Tagged = v.pipe(
  v.looseObject({ name: v.string() }),
  v.check((input) =>
    Object.entries(input).every(
      ([key, value]) => !new RegExp('^x-').test(key) || v.safeParse(v.string(), value).success,
    ),
  ),
  v.check((input) =>
    Object.entries(input).every(
      ([key, value]) =>
        ['name'].includes(key) ||
        new RegExp('^x-').test(key) ||
        v.safeParse(v.pipe(v.number(), v.integer()), value).success,
    ),
  ),
)

export type TaggedOutput = v.InferOutput<typeof Tagged>
