import { Schema } from 'effect'

export const Bag = Schema.Array(Schema.Number.check(Schema.isInt())).check(
  Schema.makeFilter(
    (input) =>
      input.filter((item) =>
        Schema.is(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(10)))(item),
      ).length >= 1,
  ),
  Schema.makeFilter(
    (input) =>
      input.filter((item) =>
        Schema.is(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(10)))(item),
      ).length <= 3,
  ),
)

export type Bag = typeof Bag.Type
