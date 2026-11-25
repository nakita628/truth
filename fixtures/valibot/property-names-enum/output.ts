import * as v from 'valibot'

export const Schema = v.partial(
  v.object({
    none: v.pipe(
      v.partial(v.looseObject({ a: v.string() })),
      v.check((input) => Object.keys(input).length === 0),
    ),
    mixed: v.pipe(
      v.partial(v.looseObject({ a: v.string() })),
      v.check((input) => Object.keys(input).every((key) => ['a'].includes(key))),
    ),
    record: v.pipe(
      v.record(v.string(), v.string()),
      v.check((input) => Object.keys(input).length === 0),
    ),
    bare: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) => Object.keys(input).length === 0),
    ),
    pattern: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) =>
        ((re) => Object.keys(input).every((key) => re.test(key)))(new RegExp('^a')),
      ),
    ),
    open: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) =>
        ((re) => Object.keys(input).every((key) => re.test(key)))(new RegExp('^a')),
      ),
    ),
    both: v.pipe(
      v.partial(v.looseObject({})),
      v.check(
        (input) =>
          ((re) => Object.keys(input).every((key) => re.test(key)))(new RegExp('^[a-z]+$')) &&
          Object.keys(input).every((key) => ['a', 'B'].includes(key)),
      ),
    ),
    closed: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) => Object.keys(input).length === 0),
    ),
    single: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) => Object.keys(input).every((key) => ['a'].includes(key))),
    ),
    letters: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) =>
        ((re) => Object.keys(input).every((key) => re.test(key)))(new RegExp('^\\p{L}+$', 'u')),
      ),
    ),
    short: v.pipe(
      v.partial(v.looseObject({})),
      v.check(
        (input) =>
          Object.keys(input).every((key) => Array.from(key).length >= 1) &&
          Object.keys(input).every((key) => Array.from(key).length <= 2),
      ),
    ),
  }),
)

export type SchemaOutput = v.InferOutput<typeof Schema>
