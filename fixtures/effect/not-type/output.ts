import { Schema } from 'effect'

export const Schema_ = Schema.Struct({
  review_target: Schema.optionalKey(
    Schema.Union([
      Schema.String.check(
        Schema.makeFilter((input) => [...input].length >= 1, {
          expected: 'a string of at least 1 character',
        }),
        Schema.makeFilter((input) => [...input].length <= 96, {
          expected: 'a string of at most 96 characters',
        }),
      ),
      Schema.Null,
    ]),
  ),
  id: Schema.NullOr(Schema.String).check(
    Schema.makeFilter((input) => !['root'].some((item) => item === input)),
  ),
})

export type Schema_ = typeof Schema_.Type
