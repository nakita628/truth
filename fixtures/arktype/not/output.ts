import { type } from 'arktype'

export const NotString = type('unknown')
  .narrow((data: unknown) => typeof data !== 'string')
  .describe('Must not be a string')

export type NotString = typeof NotString.infer
