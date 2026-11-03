import { type } from 'arktype'

export const Filter = type('unknown').pipe(
  (data) => {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return data
    const out = Object.entries(data).reduce<{ [k: string]: unknown }>((acc, [key, value]) => {
      const name = /^[^[\]]+\[([^\]]+)\]$/u.exec(key)?.[1]
      return name === undefined ? acc : { ...acc, [name]: value }
    }, {})
    return Object.keys(out).length > 0 ? out : data
  },
  type({
    age: type('string').pipe((data, ctx) => {
      const value = /^-?(?:0|[1-9]\d*)$/.test(data) ? Number(data) : Number.NaN
      return Number.isSafeInteger(value) ? value : ctx.error('an integer')
    }),
    'name?': 'string',
  }),
)

export type Filter = typeof Filter.infer
