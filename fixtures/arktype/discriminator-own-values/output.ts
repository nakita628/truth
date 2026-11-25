import { scope } from 'arktype'

const types = scope({
  Comparison: { type: "'eq' | 'ne'", key: 'string' },
  Compound: { type: "'and' | 'or'" },
  Filter: [
    ['Comparison', '&', { type: "'eq' | 'ne'" }],
    '|',
    ['Compound', '&', { type: "'and' | 'or'" }],
  ],
}).export()

export const Filter = types.Filter

export type Filter = typeof Filter.infer
