import * as v from 'valibot'

export const Ids = v.pipe(
  v.unknown(),
  v.metadata({ title: 'Ids', type: 'array', items: { type: 'integer' }, minItems: 1 }),
  v.transform((input) => {
    if (typeof input !== 'string') return input
    const text = input
    return text === '' ? [] : text.split(',')
  }),
  v.unknown(),
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
  v.minLength(1),
)

export type IdsOutput = v.InferOutput<typeof Ids>
