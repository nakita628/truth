import * as v from 'valibot'

type _Limits = {
  between?: bigint
  large?: bigint
  level?: 9007199254740992n | 2n
  big?: _Big
  maybe?: _Big | null
}

type _Big = bigint

const Big: v.GenericSchema<unknown, _Big> = v.bigint()

export const Limits: v.GenericSchema<unknown, _Limits> = v.object({
  between: v.optional(
    v.pipe(
      v.bigint(),
      v.minValue(BigInt(1)),
      v.gtValue(BigInt(5)),
      v.maxValue(BigInt(10)),
      v.ltValue(BigInt(8)),
    ),
  ),
  large: v.optional(
    v.pipe(
      v.union([
        v.bigint(),
        v.pipe(v.number(), v.integer()),
        v.pipe(v.string(), v.regex(/^-?\d+$/)),
      ]),
      v.transform((input) => BigInt(input)),
      v.minValue(-9223372036854775808n),
      v.maxValue(9223372036854775807n),
    ),
    9007199254740992n,
  ),
  level: v.optional(
    v.pipe(
      v.union([
        v.bigint(),
        v.pipe(v.number(), v.integer()),
        v.pipe(v.string(), v.regex(/^-?\d+$/)),
      ]),
      v.transform((input) => BigInt(input)),
      v.union([v.literal(9007199254740992n), v.literal(2n)]),
    ),
  ),
  big: v.optional(
    v.lazy(() => Big),
    BigInt(5),
  ),
  maybe: v.optional(v.union([v.lazy(() => Big), v.null()]), BigInt(6)),
})

export type LimitsOutput = v.InferOutput<typeof Limits>
