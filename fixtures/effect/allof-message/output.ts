import { Schema } from 'effect'

export const Merged = Schema.Unknown.check(
  Schema.makeFilter(
    (input) =>
      Schema.is(
        Schema.Struct({
          ...Schema.Struct({
            name: Schema.String.check(
              Schema.makeFilter((input) => [...input].length >= 3, {
                expected: 'a string of at least 3 characters',
              }),
            ),
          }).fields,
          ...Schema.Struct({
            age: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
          }).fields,
        }),
      )(input),
    { message: 'merged validation failed' },
  ),
).pipe(
  Schema.decodeTo(
    Schema.Struct({
      ...Schema.Struct({
        name: Schema.String.check(
          Schema.makeFilter((input) => [...input].length >= 3, {
            expected: 'a string of at least 3 characters',
          }),
        ),
      }).fields,
      ...Schema.Struct({
        age: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
      }).fields,
    }),
  ),
)

export type Merged = typeof Merged.Type
