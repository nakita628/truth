import { Schema } from 'effect'

export const Card = Schema.StructWithRest(Schema.Struct({ name: Schema.String }), [
  Schema.Record(Schema.String, Schema.Unknown),
]).check(
  Schema.makeFilter(
    (input) =>
      !Object.hasOwn(input, 'creditCard') ||
      Schema.is(Schema.Struct({ billingAddress: Schema.String }))(input),
  ),
)

export type Card = typeof Card.Type
