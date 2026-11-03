import { Schema } from 'effect'

export const Address = Schema.StructWithRest(
  Schema.Struct({ country: Schema.String, postalCode: Schema.optionalKey(Schema.String) }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).check(
  Schema.makeFilter(
    (input) =>
      !Schema.is(Schema.Struct({ country: Schema.Literal('JP') }))(input) ||
      Schema.is(Schema.Struct({ postalCode: Schema.String }))(input),
  ),
)

export type Address = typeof Address.Type
