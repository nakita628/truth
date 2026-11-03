import { type } from 'arktype'

export const Amount = type('bigint | number.integer')
  .or(/^-?\d+$/)
  .pipe((data) => BigInt(data))
  .narrow(
    (data, ctx) =>
      (data >= -9223372036854775808n && data <= 9223372036854775807n) || ctx.mustBe('an int64'),
  )
  .narrow((data: unknown) => ![0n].includes(data as never))

export type Amount = typeof Amount.infer
