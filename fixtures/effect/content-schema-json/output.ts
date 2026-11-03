import { Schema } from 'effect'

export const Payload = Schema.String

export type Payload = typeof Payload.Type
