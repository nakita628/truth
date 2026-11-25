import * as v from 'valibot'

export const Query = v.pipe(
  v.unknown(),
  v.metadata({
    title: 'Query',
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      ids: { type: 'array', items: { type: 'integer' } },
      sort: { type: 'integer', enum: [1, -1] },
      active: { type: 'boolean', enum: [true] },
      limit: { type: ['integer', 'null'] },
      cursor: { type: 'integer', format: 'uint64' },
      offset: { minimum: 0 },
      skip: { type: 'integer', not: { const: 0 } },
      flag: { oneOf: [{ type: 'integer' }, { type: 'boolean' }] },
      constructor: { type: 'integer' },
      email: { type: 'string', format: 'email' },
    },
  }),
  v.transform((input) =>
    typeof input === 'object' && input !== null && !Array.isArray(input)
      ? Object.assign(Object.create(null), input)
      : input,
  ),
  v.object({
    page: v.pipe(
      v.optional(
        v.pipe(
          v.string(),
          v.regex(/^-?(?:0|[1-9]\d*)$/),
          v.metadata({ type: 'integer', minimum: 1 }),
          v.transform((input) => Number(input)),
          v.number(),
          v.safeInteger(),
          v.minValue(1),
        ),
        '1',
      ),
      v.metadata({ default: 1 }),
    ),
    ids: v.optional(
      v.pipe(
        v.unknown(),
        v.metadata({ type: 'array', items: { type: 'integer' } }),
        v.transform((input) => (input === undefined || Array.isArray(input) ? input : [input])),
        v.array(
          v.pipe(
            v.string(),
            v.regex(/^-?(?:0|[1-9]\d*)$/),
            v.metadata({ type: 'integer' }),
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
        v.metadata({ type: 'integer', enum: [1, -1] }),
        v.transform((input) => Number(input)),
        v.union([v.literal(1), v.literal(-1)]),
      ),
    ),
    active: v.optional(
      v.pipe(
        v.string(),
        v.metadata({ type: 'boolean', enum: [true] }),
        v.pipe(
          v.string(),
          v.regex(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i),
          v.transform((input) => /^(?:true|1|yes|on|y|enabled)$/i.test(input)),
          v.literal(true),
        ),
      ),
    ),
    limit: v.optional(
      v.pipe(
        v.unknown(),
        v.metadata({ type: ['integer', 'null'] }),
        v.transform((input) => (input === 'null' ? null : input)),
        v.nullable(
          v.pipe(
            v.string(),
            v.regex(/^-?(?:0|[1-9]\d*)$/),
            v.metadata({ type: 'integer' }),
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
        v.metadata({ type: 'integer', format: 'uint64' }),
        v.pipe(
          v.string(),
          v.regex(/^-?\d+$/),
          v.transform((input) => BigInt(input)),
          v.minValue(0n),
          v.maxValue(18446744073709551615n),
        ),
      ),
    ),
    offset: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/),
        v.metadata({ type: 'number', minimum: 0 }),
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
        v.metadata({ type: 'integer' }),
        v.transform((input) => Number(input)),
        v.number(),
        v.safeInteger(),
        v.check((input) => input !== 0),
      ),
    ),
    flag: v.optional(
      v.pipe(
        v.unknown(),
        v.metadata({ oneOf: [{ type: 'integer' }, { type: 'boolean' }] }),
        v.union([
          v.pipe(
            v.string(),
            v.regex(/^-?(?:0|[1-9]\d*)$/),
            v.metadata({ type: 'integer' }),
            v.transform((input) => Number(input)),
            v.number(),
            v.safeInteger(),
          ),
          v.pipe(
            v.string(),
            v.metadata({ type: 'boolean' }),
            v.pipe(
              v.string(),
              v.regex(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i),
              v.transform((input) => /^(?:true|1|yes|on|y|enabled)$/i.test(input)),
            ),
          ),
        ]),
      ),
    ),
    constructor: v.optional(
      v.pipe(
        v.string(),
        v.regex(/^-?(?:0|[1-9]\d*)$/),
        v.metadata({ type: 'integer' }),
        v.transform((input) => Number(input)),
        v.number(),
        v.safeInteger(),
      ),
    ),
    email: v.optional(v.pipe(v.string(), v.trim(), v.email())),
  }),
)

export type QueryOutput = v.InferOutput<typeof Query>
