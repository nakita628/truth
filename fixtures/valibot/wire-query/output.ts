import * as v from 'valibot'

export const Query = v.pipe(
  v.unknown(),
  v.transform((input) =>
    typeof input === 'object' && input !== null && !Array.isArray(input)
      ? Object.assign(Object.create(null), input)
      : input,
  ),
  v.object({
    page: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^-?(?:0|[1-9]\d*)$/),
        v.transform((input) => Number(input)),
        v.number(),
        v.safeInteger(),
        v.minValue(1),
      ),
      '1',
    ),
    ids: v.optional(
      v.pipe(
        v.unknown(),
        v.transform((input) => (input === undefined || Array.isArray(input) ? input : [input])),
        v.array(
          v.pipe(
            v.string(),
            v.regex(/^-?(?:0|[1-9]\d*)$/),
            v.transform((input) => Number(input)),
            v.number(),
            v.safeInteger(),
          ),
        ),
      ),
    ),
    sort: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^-?(?:0|[1-9]\d*)$/),
        v.transform((input) => Number(input)),
        v.union([v.literal(1), v.literal(-1)]),
      ),
    ),
    active: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i),
        v.transform((input) => /^(?:true|1|yes|on|y|enabled)$/i.test(input)),
        v.literal(true),
      ),
    ),
    limit: v.optional(
      v.pipe(
        v.unknown(),
        v.transform((input) => (input === 'null' ? null : input)),
        v.nullable(
          v.pipe(
            v.string(),
            v.regex(/^-?(?:0|[1-9]\d*)$/),
            v.transform((input) => Number(input)),
            v.number(),
            v.safeInteger(),
          ),
        ),
      ),
    ),
    cursor: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^-?\d+$/),
        v.transform((input) => BigInt(input)),
        v.minValue(0n),
        v.maxValue(18446744073709551615n),
      ),
    ),
    offset: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/),
        v.transform((input) => Number(input)),
        v.number(),
        v.finite(),
        v.minValue(0),
      ),
    ),
    skip: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^-?(?:0|[1-9]\d*)$/),
        v.transform((input) => Number(input)),
        v.number(),
        v.safeInteger(),
        v.check((input) => input !== 0),
      ),
    ),
    flag: v.optional(
      v.union([
        v.pipe(
          v.string(),
          v.regex(/^-?(?:0|[1-9]\d*)$/),
          v.transform((input) => Number(input)),
          v.number(),
          v.safeInteger(),
        ),
        v.pipe(
          v.string(),
          v.regex(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i),
          v.transform((input) => /^(?:true|1|yes|on|y|enabled)$/i.test(input)),
        ),
      ]),
    ),
    constructor: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^-?(?:0|[1-9]\d*)$/),
        v.transform((input) => Number(input)),
        v.number(),
        v.safeInteger(),
      ),
    ),
    email: v.optional(v.pipe(v.string(), v.trim(), v.email())),
  }),
)

export type QueryOutput = v.InferOutput<typeof Query>
