import * as v from 'valibot'

export const Config = v.record(v.string(), v.string())

export type ConfigOutput = v.InferOutput<typeof Config>
