import { Codec, Type, type Static } from 'typebox'

export const Query = Type.Object({
  ratio: Type.Optional(
    Codec(
      Type.Refine(
        Type.String({ pattern: '^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$' }),
        (value) => Number.isFinite(Number(value)),
        () => 'must be a finite number',
      ),
    )
      .Decode((value) => Number(value))
      .Encode((value) => String(value)),
  ),
  score: Type.Optional(
    Codec(
      Type.Refine(
        Type.Refine(
          Type.String({ pattern: '^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$' }),
          (value) => Number.isFinite(Number(value)),
          () => 'must be a finite number',
        ),
        (value) => Number(value) >= 1,
        () => 'must be >= 1',
      ),
    )
      .Decode((value) => Number(value))
      .Encode((value) => String(value)),
  ),
  id: Type.Optional(
    Codec(
      Type.Refine(
        Type.String({ pattern: '^-?(?:0|[1-9]\\d*)$' }),
        (value) => Number.isSafeInteger(Number(value)),
        () => 'must be a safe integer',
      ),
    )
      .Decode((value) => Number(value))
      .Encode((value) => String(value)),
  ),
  count: Type.Optional(
    Codec(
      Type.Refine(
        Type.Refine(
          Type.String({ pattern: '^-?(?:0|[1-9]\\d*)$' }),
          (value) => Number.isSafeInteger(Number(value)),
          () => 'must be a safe integer',
        ),
        (value) => Number(value) <= 9007199254740991,
        () => 'must be <= 9007199254740991',
      ),
    )
      .Decode((value) => Number(value))
      .Encode((value) => String(value)),
  ),
  total: Type.Optional(
    Codec(
      Type.Refine(
        Type.Refine(
          Type.String({ pattern: '^-?\\d+$' }),
          (value) => BigInt(value) >= -9223372036854775808n,
          () => 'must be >= -9223372036854775808',
        ),
        (value) => BigInt(value) <= 9223372036854775807n,
        () => 'must be <= 9223372036854775807',
      ),
    )
      .Decode((value) => BigInt(value))
      .Encode((value) => String(value)),
  ),
  small: Type.Optional(
    Codec(
      Type.Refine(
        Type.Refine(
          Type.Refine(
            Type.String({ pattern: '^-?(?:0|[1-9]\\d*)$' }),
            (value) => Number.isSafeInteger(Number(value)),
            () => 'must be a safe integer',
          ),
          (value) => Number(value) >= -2147483648,
          () => 'must be >= -2147483648',
        ),
        (value) => Number(value) <= 2147483647,
        () => 'must be <= 2147483647',
      ),
    )
      .Decode((value) => Number(value))
      .Encode((value) => String(value)),
  ),
  single: Type.Optional(
    Codec(
      Type.Refine(
        Type.Refine(
          Type.Refine(
            Type.String({ pattern: '^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$' }),
            (value) => Number.isFinite(Number(value)),
            () => 'must be a finite number',
          ),
          (value) => Number(value) >= -3.4028234663852886e38,
          () => 'must be >= -3.4028234663852886e38',
        ),
        (value) => Number(value) <= 3.4028234663852886e38,
        () => 'must be <= 3.4028234663852886e38',
      ),
    )
      .Decode((value) => Number(value))
      .Encode((value) => String(value)),
  ),
})

export type Query = Static<typeof Query>
