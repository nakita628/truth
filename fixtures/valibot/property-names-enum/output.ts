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
      v.check((input) => Object.keys(input).every((key) => /^a/.test(key))),
    ),
    open: v.pipe(
      v.partial(v.looseObject({})),
      v.check((input) => Object.keys(input).every((key) => /^a/.test(key))),
    ),
    both: v.pipe(
      v.partial(v.looseObject({})),
      v.check(
        (input) =>
          Object.keys(input).every((key) => /^[a-z]+$/.test(key)) &&
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
      v.check((input) => Object.keys(input).every((key) => /^\p{L}+$/u.test(key))),
    ),
  }),
)

export type SchemaOutput = v.InferOutput<typeof Schema>
