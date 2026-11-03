import { scope } from 'arktype'

const types = scope({
  Mode: "'coerce' | 'ignore_malformed' | 'strict'",
  Precision: 'number',
  Settings: {
    'precision?': 'Precision',
    'mode?': 'Mode',
    'fallbackMode?': 'Mode',
    'ratio?': 'number',
    'count?': 'number.integer | null',
    'attachments?': "'cover' | boolean",
  },
}).export()

export const Settings = types.Settings

export type Settings = typeof Settings.infer
