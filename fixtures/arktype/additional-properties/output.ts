import { type } from 'arktype'

export const Config = type({ '[string]': 'string' })

export type Config = typeof Config.infer
