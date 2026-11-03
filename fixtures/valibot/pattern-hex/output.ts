import * as v from 'valibot'

export const Metadata = v.pipe(v.string(), v.regex(/^[\x00-\uFFFF]*$/))

export type MetadataOutput = v.InferOutput<typeof Metadata>
