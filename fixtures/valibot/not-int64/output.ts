import * as v from 'valibot'

export const Amount = v.pipe(
  v.union([v.bigint(), v.pipe(v.number(), v.integer()), v.pipe(v.string(), v.regex(/^-?\d+$/))]),
  v.transform((input) => BigInt(input)),
  v.minValue(-9223372036854775808n),
  v.maxValue(9223372036854775807n),
  v.check((input) => ![0n].some((item) => item === input)),
)

export type AmountOutput = v.InferOutput<typeof Amount>
