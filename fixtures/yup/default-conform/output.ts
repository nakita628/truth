import * as yup from 'yup'

export const Settings = yup.object({
  precision: yup.mixed(),
  mode: yup.mixed(),
  fallbackMode: yup.mixed(),
  ratio: yup.number(),
  count: yup.number().integer(),
  attachments: yup.string(),
})

export type Settings = yup.InferType<typeof Settings>
