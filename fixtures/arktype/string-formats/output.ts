import { type } from 'arktype'

export const Formats = type({
  'id?': type('bigint | number.integer')
    .or(/^-?\d+$/)
    .pipe((data) => BigInt(data))
    .narrow(
      (data, ctx) =>
        (data >= -9223372036854775808n && data <= 9223372036854775807n) || ctx.mustBe('an int64'),
    )
    .narrow((data, ctx) => data >= 0n || ctx.mustBe('at least 0')),
  'size?': type('bigint | number.integer')
    .or(/^-?\d+$/)
    .pipe((data) => BigInt(data))
    .narrow((data, ctx) => (data >= 0n && data <= 18446744073709551615n) || ctx.mustBe('a uint64')),
  'kind?': type('bigint | number.integer')
    .or(/^-?\d+$/)
    .pipe((data) => BigInt(data))
    .to('1n | 2n'),
  'at?': type(
    /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|([+-](?:[01]\d|2[0-3]):[0-5]\d)))$/,
  ),
  'time?': type(
    /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/,
  ),
  'guid?': type(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/),
  'site?': type('string.url').and(/^https?:\/\//),
  'card?': 'string.creditCard',
  'iban?': 'string',
  'currency?': 'string',
  'slug?': type('string.trim'),
  'email?': type('string.trim').to('string.email'),
})

export type Formats = typeof Formats.infer
