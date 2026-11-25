import * as v from 'valibot'

export const Query = v.partial(
  v.object({
    ratio: v.pipe(
      v.string(),
      v.regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/),
      v.metadata({ type: 'number' }),
      v.transform((input) => Number(input)),
      v.number(),
      v.finite(),
    ),
    score: v.pipe(
      v.string(),
      v.regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/),
      v.metadata({ type: 'number', minimum: 1 }),
      v.transform((input) => Number(input)),
      v.number(),
      v.finite(),
      v.minValue(1),
    ),
    id: v.pipe(
      v.string(),
      v.regex(/^-?(?:0|[1-9]\d*)$/),
      v.metadata({ type: 'integer' }),
      v.transform((input) => Number(input)),
      v.number(),
      v.safeInteger(),
    ),
    count: v.pipe(
      v.string(),
      v.regex(/^-?(?:0|[1-9]\d*)$/),
      v.metadata({ type: 'integer', maximum: 9007199254740991 }),
      v.transform((input) => Number(input)),
      v.number(),
      v.safeInteger(),
      v.maxValue(9007199254740991),
    ),
  }),
)

export type QueryOutput = v.InferOutput<typeof Query>
