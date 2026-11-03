import { Schema } from 'effect'

export const Vehicle = Schema.StructWithRest(
  Schema.Struct({ type: Schema.Literals(['car', 'truck']) }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).check(
  Schema.makeFilter(
    (input) =>
      !Schema.is(Schema.Struct({ type: Schema.optional(Schema.Literal('truck')) }))(input) ||
      Schema.is(
        Schema.Struct({ cargoCapacity: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)) }),
      )(input),
  ),
  Schema.makeFilter(
    (input) =>
      Schema.is(Schema.Struct({ type: Schema.optional(Schema.Literal('truck')) }))(input) ||
      Schema.is(
        Schema.Struct({
          passengerCount: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
        }),
      )(input),
  ),
)
