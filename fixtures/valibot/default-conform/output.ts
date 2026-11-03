import * as v from 'valibot'

type _Settings = {
  precision?: _Precision
  mode?: _Mode
  fallbackMode?: _Mode
  ratio?: number
  count?: number | null
  attachments?: 'cover' | boolean
}

type _Mode = 'coerce' | 'ignore_malformed' | 'strict'

type _Precision = number

const Mode: v.GenericSchema<unknown, _Mode> = v.picklist(['coerce', 'ignore_malformed', 'strict'])

const Precision: v.GenericSchema<unknown, _Precision> = v.number()

export const Settings: v.GenericSchema<unknown, _Settings> = v.object({
  precision: v.optional(
    v.lazy(() => Precision),
    7,
  ),
  mode: v.optional(v.lazy(() => Mode)),
  fallbackMode: v.optional(
    v.lazy(() => Mode),
    'coerce',
  ),
  ratio: v.optional(v.number(), 0.5),
  count: v.optional(v.nullable(v.pipe(v.number(), v.integer()))),
  attachments: v.optional(v.union([v.literal('cover'), v.boolean()]), false),
})

export type SettingsOutput = v.InferOutput<typeof Settings>
