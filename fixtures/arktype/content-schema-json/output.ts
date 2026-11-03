import { type } from 'arktype'

export const StyleBag = type({ 'style?': 'string' })

export type StyleBag = typeof StyleBag.infer
