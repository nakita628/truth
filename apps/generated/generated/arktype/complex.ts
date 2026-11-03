import { scope } from 'arktype'

const types = scope({
  E: {
    'label?': 'string',
    'reference?': 'E',
    'flags?': ['string[]', ':', (data: unknown[], ctx) => new Set(data).size === data.length],
    'meta?': { '[string]': 'string' },
  },
  D: { score: 'number.integer >= 0 & number.integer <= 100', 'extra?': 'null | null | E' },
  B: { type: "'B'", name: 'string', detail: ['D', '&', { 'comment?': 'string' }] },
  C: { type: "'C'", entries: ['E[]', '&', 'unknown[] >= 1'] },
  A: { id: 'string.uuid', type: "'B' | 'C'", payload: 'B | C' },
}).export()

export const A = types.A
