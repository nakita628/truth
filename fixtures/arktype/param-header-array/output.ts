import { type } from 'arktype'

export const Headers = type({
  'x-ids?': type('unknown').pipe(
    (data) => {
      if (typeof data !== 'string') return data
      const text = data
      return text === '' ? [] : text.split(',')
    },
    type('unknown').pipe(
      (data) => (data === undefined || Array.isArray(data) ? data : [data]),
      type(
        type('string').pipe((data, ctx) => {
          const value = /^-?(?:0|[1-9]\d*)$/.test(data) ? Number(data) : Number.NaN
          return Number.isSafeInteger(value) ? value : ctx.error('an integer')
        }),
      ).array(),
    ),
  ),
})

export type Headers = typeof Headers.infer
