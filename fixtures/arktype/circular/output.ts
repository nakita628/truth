import { scope } from 'arktype'

const types = scope({ B: { 'a?': 'A' }, A: { 'b?': 'B' } }).export()

export const A = types.A

export type A = typeof A.infer
