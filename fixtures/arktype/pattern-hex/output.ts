import { type } from 'arktype'

export const Metadata = type('string').and(/^[\x00-\uFFFF]*$/)

export type Metadata = typeof Metadata.infer
