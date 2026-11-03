import { Schema } from 'effect'

export const Schema_ = Schema.Struct({
  first_name: Schema.optional(Schema.String),
  last_name: Schema.optional(Schema.String),
  birthday: Schema.optional(
    Schema.String.check(
      Schema.isPattern(
        /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))$/,
      ),
    ),
  ),
  address: Schema.optional(
    Schema.Struct({
      street_address: Schema.optional(Schema.String),
      city: Schema.optional(Schema.String),
      state: Schema.optional(Schema.String),
      country: Schema.optional(Schema.String),
    }),
  ),
})
