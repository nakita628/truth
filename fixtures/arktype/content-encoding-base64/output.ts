import { type } from 'arktype'

export const ImageBag = type({ 'image?': 'string' })

export type ImageBag = typeof ImageBag.infer
