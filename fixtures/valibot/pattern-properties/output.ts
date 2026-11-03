import * as v from 'valibot'

export const PatternMap = v.pipe(
  v.record(v.string(), v.unknown()),
  v.check((input) =>
    Object.entries(input).every(
      ([key, value]) => !new RegExp('^S').test(key) || v.safeParse(v.string(), value).success,
    ),
  ),
  v.check((input) =>
    Object.entries(input).every(
      ([key, value]) =>
        !new RegExp('^I').test(key) || v.safeParse(v.pipe(v.number(), v.integer()), value).success,
    ),
  ),
)

export type PatternMapOutput = v.InferOutput<typeof PatternMap>
