import { Schema } from 'effect'

export const Card = Schema.Struct({ name: Schema.String }).check(
  Schema.makeFilter(
    (input) =>
      !('creditCard' in input) ||
      Schema.is(Schema.Struct({ billingAddress: Schema.String }))(input),
  ),
)

export type Card = typeof Card.Type
