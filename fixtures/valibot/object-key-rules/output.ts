import * as v from 'valibot'

export const KeyRules = v.pipe(
  v.looseObject({ a: v.string() }),
  v.check((input) =>
    Object.entries(input).every(
      ([key, value]) => !new RegExp('^x-').test(key) || v.safeParse(v.string(), value).success,
    ),
  ),
  v.check((input) => ['kind'].every((key) => key in input)),
  v.check((input) =>
    Object.entries(input).every(
      ([key, value]) =>
        ['a'].includes(key) ||
        new RegExp('^x-').test(key) ||
        v.safeParse(v.pipe(v.number(), v.integer()), value).success,
    ),
  ),
)

export type KeyRulesOutput = v.InferOutput<typeof KeyRules>
