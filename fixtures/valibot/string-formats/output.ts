import * as v from 'valibot'

export const Formats = v.partial(
  v.object({
    id: v.pipe(
      v.union([
        v.bigint(),
        v.pipe(v.number(), v.integer()),
        v.pipe(v.string(), v.regex(/^-?\d+$/)),
      ]),
      v.transform((input) => BigInt(input)),
      v.minValue(-9223372036854775808n),
      v.maxValue(9223372036854775807n),
      v.minValue(0n),
    ),
    size: v.pipe(
      v.union([
        v.bigint(),
        v.pipe(v.number(), v.integer()),
        v.pipe(v.string(), v.regex(/^-?\d+$/)),
      ]),
      v.transform((input) => BigInt(input)),
      v.minValue(0n),
      v.maxValue(18446744073709551615n),
    ),
    kind: v.pipe(
      v.union([
        v.bigint(),
        v.pipe(v.number(), v.integer()),
        v.pipe(v.string(), v.regex(/^-?\d+$/)),
      ]),
      v.transform((input) => BigInt(input)),
      v.union([v.literal(1n), v.literal(2n)]),
    ),
    at: v.pipe(
      v.string(),
      v.regex(
        /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|([+-](?:[01]\d|2[0-3]):[0-5]\d)))$/,
      ),
    ),
    time: v.pipe(
      v.string(),
      v.regex(
        /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/,
      ),
    ),
    guid: v.pipe(
      v.string(),
      v.regex(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/),
    ),
    site: v.pipe(v.string(), v.url(), v.regex(/^https?:\/\//)),
    card: v.pipe(v.string(), v.creditCard()),
    iban: v.string(),
    currency: v.string(),
    slug: v.pipe(v.string(), v.trim()),
    email: v.pipe(v.string(), v.trim(), v.email()),
  }),
)

export type FormatsOutput = v.InferOutput<typeof Formats>
