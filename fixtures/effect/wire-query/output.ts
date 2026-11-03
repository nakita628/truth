import { Effect, Schema, SchemaTransformation } from 'effect'

export const Query = Schema.Unknown.pipe(
  Schema.decodeTo(
    Schema.Unknown,
    SchemaTransformation.transform<unknown, unknown>({
      decode: (input) =>
        typeof input === 'object' && input !== null && !Array.isArray(input)
          ? Object.assign(Object.create(null), input)
          : input,
      encode: (output) => output,
    }),
  ),
  Schema.decodeTo(
    Schema.Struct({
      page: Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)$/))
        .pipe(
          Schema.decodeTo(
            Schema.Finite,
            SchemaTransformation.transform({
              decode: (input) => Number(input),
              encode: (output) => String(output),
            }),
          ),
        )
        .check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1))
        .pipe(Schema.withDecodingDefaultType(Effect.succeed(1))),
      ids: Schema.optionalKey(
        Schema.Unknown.pipe(
          Schema.decodeTo(
            Schema.Unknown,
            SchemaTransformation.transform<unknown, unknown>({
              decode: (input) => (input === undefined || Array.isArray(input) ? input : [input]),
              encode: (output) => output,
            }),
          ),
          Schema.decodeTo(
            Schema.Array(
              Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)$/))
                .pipe(
                  Schema.decodeTo(
                    Schema.Finite,
                    SchemaTransformation.transform({
                      decode: (input) => Number(input),
                      encode: (output) => String(output),
                    }),
                  ),
                )
                .check(Schema.isInt()),
            ),
          ),
        ),
      ),
      sort: Schema.optionalKey(
        Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)$/))
          .pipe(
            Schema.decodeTo(
              Schema.Finite,
              SchemaTransformation.transform({
                decode: (input) => Number(input),
                encode: (output) => String(output),
              }),
            ),
          )
          .pipe(Schema.decodeTo(Schema.Literals([1, -1]))),
      ),
      active: Schema.optionalKey(
        Schema.String.check(
          Schema.isPattern(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i),
        )
          .pipe(
            Schema.decodeTo(
              Schema.Boolean,
              SchemaTransformation.transform({
                decode: (input) => /^(?:true|1|yes|on|y|enabled)$/i.test(input),
                encode: (output) => (output ? 'true' : 'false'),
              }),
            ),
          )
          .pipe(Schema.decodeTo(Schema.Literal(true))),
      ),
      limit: Schema.optionalKey(
        Schema.Unknown.pipe(
          Schema.decodeTo(
            Schema.Unknown,
            SchemaTransformation.transform<unknown, unknown>({
              decode: (input) => (input === 'null' ? null : input),
              encode: (output) => output,
            }),
          ),
          Schema.decodeTo(
            Schema.NullOr(
              Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)$/))
                .pipe(
                  Schema.decodeTo(
                    Schema.Finite,
                    SchemaTransformation.transform({
                      decode: (input) => Number(input),
                      encode: (output) => String(output),
                    }),
                  ),
                )
                .check(Schema.isInt()),
            ),
          ),
        ),
      ),
      cursor: Schema.optionalKey(
        Schema.BigIntFromString.check(
          Schema.isBetweenBigInt({ minimum: 0n, maximum: 18446744073709551615n }),
        ),
      ),
      offset: Schema.optionalKey(
        Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/))
          .pipe(
            Schema.decodeTo(
              Schema.Finite,
              SchemaTransformation.transform({
                decode: (input) => Number(input),
                encode: (output) => String(output),
              }),
            ),
          )
          .check(Schema.isGreaterThanOrEqualTo(0)),
      ),
      skip: Schema.optionalKey(
        Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)$/))
          .pipe(
            Schema.decodeTo(
              Schema.Finite,
              SchemaTransformation.transform({
                decode: (input) => Number(input),
                encode: (output) => String(output),
              }),
            ),
          )
          .check(Schema.isInt())
          .check(Schema.makeFilter((input) => input !== 0)),
      ),
      flag: Schema.optionalKey(
        Schema.Union([
          Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)$/))
            .pipe(
              Schema.decodeTo(
                Schema.Finite,
                SchemaTransformation.transform({
                  decode: (input) => Number(input),
                  encode: (output) => String(output),
                }),
              ),
            )
            .check(Schema.isInt()),
          Schema.String.check(
            Schema.isPattern(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i),
          ).pipe(
            Schema.decodeTo(
              Schema.Boolean,
              SchemaTransformation.transform({
                decode: (input) => /^(?:true|1|yes|on|y|enabled)$/i.test(input),
                encode: (output) => (output ? 'true' : 'false'),
              }),
            ),
          ),
        ]),
      ),
      constructor: Schema.optionalKey(
        Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)$/))
          .pipe(
            Schema.decodeTo(
              Schema.Finite,
              SchemaTransformation.transform({
                decode: (input) => Number(input),
                encode: (output) => String(output),
              }),
            ),
          )
          .check(Schema.isInt()),
      ),
      email: Schema.optionalKey(
        Schema.Trim.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
      ),
    }),
  ),
)

export type Query = typeof Query.Type
