import { Schema } from 'effect'

export const Messaged = Schema.Struct({
  n: Schema.optionalKey(
    Schema.Unknown.check(
      Schema.makeFilter((input) => typeof input !== 'number' || input >= 5, { message: 'low' }),
      Schema.makeFilter((input) => typeof input !== 'number' || input <= 9, { message: 'high' }),
    ),
  ),
  s: Schema.optionalKey(
    Schema.Unknown.check(
      Schema.makeFilter(
        (input) =>
          (typeof input !== 'string' || input.length >= 3) &&
          (typeof input !== 'string' || /^a/.test(input)),
        { message: 'bad' },
      ),
    ),
  ),
})

export type Messaged = typeof Messaged.Type
