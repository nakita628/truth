import { scope } from 'arktype'

const types = scope({ C: 'string', B: { 'c?': 'C' }, A: { 'b?': 'B' } }).export()

export const A = types.A

export type A = typeof A.infer
