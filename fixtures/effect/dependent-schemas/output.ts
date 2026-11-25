import { Schema } from 'effect'

export const Card = Schema.Struct({ name: Schema.String }).check(
  Schema.makeFilter(
    (input) =>
      !Object.hasOwn(input, 'creditCard') ||
      Schema.is(Schema.Struct({ billingAddress: Schema.String }))(input),
  ),
)

export type Card = typeof Card.Type
