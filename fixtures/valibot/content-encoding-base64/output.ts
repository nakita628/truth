import * as v from 'valibot'

export const Photo = v.object({ image: v.string() })

export type PhotoOutput = v.InferOutput<typeof Photo>
