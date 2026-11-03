import * as v from 'valibot'

export const Style = v.object({ style: v.string() })

export type StyleOutput = v.InferOutput<typeof Style>
