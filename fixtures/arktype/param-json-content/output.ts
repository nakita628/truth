import { type } from 'arktype'

export const Payload = type('unknown').pipe(
  (data) => {
    if (typeof data !== 'string') return data
    try {
      return JSON.parse(data)
    } catch {
      return data
    }
  },
  type({ id: 'number.integer', 'tags?': 'string[]' }),
)

export type Payload = typeof Payload.infer
