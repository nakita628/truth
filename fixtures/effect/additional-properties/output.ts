import { Schema } from 'effect'

export const Config = Schema.Record(Schema.String, Schema.String)

export type Config = typeof Config.Type
