import { type } from 'arktype'

export const Shape = type(type({ kind: "'circle'", radius: 'number' }))
  .or(type({ kind: "'rectangle'", width: 'number', height: 'number' }))
  .describe('Must be a valid shape')

export type Shape = typeof Shape.infer
