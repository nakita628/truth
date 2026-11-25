import { Schema } from 'effect'

export const Shadowed = Schema.Struct({
  typed: Schema.optionalKey(
    Schema.StructWithRest(Schema.Struct({ a: Schema.optionalKey(Schema.String) }), [
      Schema.Record(Schema.String, Schema.Unknown),
    ]).check(
      Schema.makeFilter((input) =>
        Object.entries(input).every(
          ([key, value]) =>
            ['a'].includes(key) || Schema.is(Schema.toEncoded(Schema.String))(value),
        ),
      ),
    ),
  ),
  open: Schema.optionalKey(Schema.Struct({ a: Schema.optionalKey(Schema.String) })),
})

export type Shadowed = typeof Shadowed.Type
