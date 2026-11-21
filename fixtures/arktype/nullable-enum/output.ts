import { type } from 'arktype'

export const Schema = type({
  finish_reason: "'stop' | 'length' | null",
  'status?': "'active' | 'inactive' | null",
})

export type Schema = typeof Schema.infer
