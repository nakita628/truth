import * as v from 'valibot'

export const Schema = v.partial(
  v.object({
    first_name: v.string(),
    last_name: v.string(),
    birthday: v.pipe(
      v.string(),
      v.regex(
        /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))$/,
      ),
    ),
    address: v.partial(
      v.object({
        street_address: v.string(),
        city: v.string(),
        state: v.string(),
        country: v.string(),
      }),
    ),
  }),
)
