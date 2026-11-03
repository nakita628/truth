import { type } from 'arktype'

export const Query = type('object')
  .pipe(
    (data) =>
      typeof data === 'object' && data !== null && !Array.isArray(data)
        ? Object.assign(Object.create(null), data)
        : data,
    type({
      page: type('string')
        .pipe((data, ctx) => {
          const value = /^-?(?:0|[1-9]\d*)$/.test(data) ? Number(data) : Number.NaN
          return Number.isSafeInteger(value) ? value : ctx.error('an integer')
        })
        .to('number.integer >= 1'),
      'ids?': type('unknown').pipe(
        (data) => (data === undefined || Array.isArray(data) ? data : [data]),
        type(
          type('string').pipe((data, ctx) => {
            const value = /^-?(?:0|[1-9]\d*)$/.test(data) ? Number(data) : Number.NaN
            return Number.isSafeInteger(value) ? value : ctx.error('an integer')
          }),
        ).array(),
      ),
      'sort?': type('string')
        .pipe((data, ctx) => {
          const value = /^-?(?:0|[1-9]\d*)$/.test(data) ? Number(data) : Number.NaN
          return Number.isSafeInteger(value) ? value : ctx.error('an integer')
        })
        .to('1 | -1'),
      'active?': type(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i)
        .pipe((data) => /^(?:true|1|yes|on|y|enabled)$/i.test(data))
        .to('true'),
      'limit?': type('unknown').pipe(
        (data) => (data === 'null' ? null : data),
        type(
          type('string').pipe((data, ctx) => {
            const value = /^-?(?:0|[1-9]\d*)$/.test(data) ? Number(data) : Number.NaN
            return Number.isSafeInteger(value) ? value : ctx.error('an integer')
          }),
        ).or('null'),
      ),
      'cursor?': type('string')
        .pipe((data, ctx) => (/^-?\d+$/.test(data) ? BigInt(data) : ctx.error('an integer')))
        .narrow(
          (data, ctx) => (data >= 0n && data <= 18446744073709551615n) || ctx.mustBe('a uint64'),
        ),
      'offset?': type('string')
        .pipe((data, ctx) => {
          const value = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(data)
            ? Number(data)
            : Number.NaN
          return Number.isFinite(value) ? value : ctx.error('a number')
        })
        .to('number >= 0'),
      'skip?': type('string')
        .pipe((data, ctx) => {
          const value = /^-?(?:0|[1-9]\d*)$/.test(data) ? Number(data) : Number.NaN
          return Number.isSafeInteger(value) ? value : ctx.error('an integer')
        })
        .narrow((data: unknown) => data !== 0),
      'flag?': type('unknown').pipe((data, ctx) => {
        for (const branch of [
          type('string').pipe((data, ctx) => {
            const value = /^-?(?:0|[1-9]\d*)$/.test(data) ? Number(data) : Number.NaN
            return Number.isSafeInteger(value) ? value : ctx.error('an integer')
          }),
          type(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i).pipe((data) =>
            /^(?:true|1|yes|on|y|enabled)$/i.test(data),
          ),
        ]) {
          const out = branch(data)
          if (!(out instanceof type.errors)) return out
        }
        return ctx.error('one of the members')
      }),
      'constructor?': type('string').pipe((data, ctx) => {
        const value = /^-?(?:0|[1-9]\d*)$/.test(data) ? Number(data) : Number.NaN
        return Number.isSafeInteger(value) ? value : ctx.error('an integer')
      }),
      'email?': type('string.trim').to('string.email'),
    }),
  )
  .pipe((data) => ({ ...data }))

export type Query = typeof Query.infer
