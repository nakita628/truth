import { Schema, SchemaTransformation } from 'effect'

export const Formats = Schema.Struct({
  id: Schema.optionalKey(
    Schema.Union([
      Schema.BigInt,
      Schema.Number.check(Schema.isInt()),
      Schema.String.check(Schema.isPattern(/^-?\d+$/)),
    ])
      .pipe(
        Schema.decodeTo(
          Schema.BigInt,
          SchemaTransformation.transform({
            decode: (input) => BigInt(input),
            encode: (output) => output,
          }),
        ),
      )
      .check(
        Schema.isBetweenBigInt({ minimum: -9223372036854775808n, maximum: 9223372036854775807n }),
        Schema.isGreaterThanOrEqualToBigInt(0n),
      ),
  ),
  size: Schema.optionalKey(
    Schema.Union([
      Schema.BigInt,
      Schema.Number.check(Schema.isInt()),
      Schema.String.check(Schema.isPattern(/^-?\d+$/)),
    ])
      .pipe(
        Schema.decodeTo(
          Schema.BigInt,
          SchemaTransformation.transform({
            decode: (input) => BigInt(input),
            encode: (output) => output,
          }),
        ),
      )
      .check(Schema.isBetweenBigInt({ minimum: 0n, maximum: 18446744073709551615n })),
  ),
  kind: Schema.optionalKey(
    Schema.Union([
      Schema.BigInt,
      Schema.Number.check(Schema.isInt()),
      Schema.String.check(Schema.isPattern(/^-?\d+$/)),
    ])
      .pipe(
        Schema.decodeTo(
          Schema.BigInt,
          SchemaTransformation.transform({
            decode: (input) => BigInt(input),
            encode: (output) => output,
          }),
        ),
      )
      .pipe(Schema.decodeTo(Schema.Literals([1n, 2n]))),
  ),
  at: Schema.optionalKey(
    Schema.String.check(
      Schema.isPattern(
        /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|([+-](?:[01]\d|2[0-3]):[0-5]\d)))$/,
      ),
    ),
  ),
  time: Schema.optionalKey(
    Schema.String.check(
      Schema.isPattern(
        /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/,
      ),
    ),
  ),
  guid: Schema.optionalKey(
    Schema.String.check(
      Schema.isPattern(
        /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
      ),
    ),
  ),
  site: Schema.optionalKey(
    Schema.String.check(
      Schema.makeFilter((input) => URL.canParse(input) && /^https?:\/\//.test(input)),
    ),
  ),
  card: Schema.optionalKey(Schema.String),
  iban: Schema.optionalKey(Schema.String),
  currency: Schema.optionalKey(Schema.String),
  slug: Schema.optionalKey(Schema.Trim),
  email: Schema.optionalKey(
    Schema.Trim.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
  ),
})

export type Formats = typeof Formats.Type
