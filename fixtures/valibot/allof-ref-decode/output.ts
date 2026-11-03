import * as v from 'valibot'

type _Item = { detail?: _D & { comment?: string; id?: bigint } }

type _D = { text?: string }

const D: v.GenericSchema<unknown, _D> = v.partial(v.object({ text: v.string() }))

export const Item: v.GenericSchema<unknown, _Item> = v.partial(
  v.object({
    detail: v.intersect([
      v.lazy(() => D),
      v.object({
        comment: v.optional(v.string(), 'N/A'),
        id: v.optional(
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
        ),
      }),
    ]),
  }),
)

export type ItemOutput = v.InferOutput<typeof Item>
