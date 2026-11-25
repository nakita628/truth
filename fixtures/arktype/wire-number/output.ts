import { type } from 'arktype'

export const Query = type({
  'ratio?': type('string').pipe((data, ctx) => {
    const value = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(data)
      ? Number(data)
      : Number.NaN
    return Number.isFinite(value) ? value : ctx.error('a number')
  }),
  'score?': type('string')
    .pipe((data, ctx) => {
      const value = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(data)
        ? Number(data)
        : Number.NaN
      return Number.isFinite(value) ? value : ctx.error('a number')
    })
    .to('number >= 1'),
  'id?': type('string').pipe((data, ctx) => {
    const value = /^-?(?:0|[1-9]\d*)$/.test(data) ? Number(data) : Number.NaN
    return Number.isSafeInteger(value) ? value : ctx.error('an integer')
  }),
  'count?': type('string')
    .pipe((data, ctx) => {
      const value = /^-?(?:0|[1-9]\d*)$/.test(data) ? Number(data) : Number.NaN
      return Number.isSafeInteger(value) ? value : ctx.error('an integer')
    })
    .to('number.integer <= 9007199254740991'),
})

export type Query = typeof Query.infer
