import * as yup from 'yup'

export const Api = yup.object({
  name: yup.string().required(),
  spec: yup.object({ tags: yup.mixed(), root: yup.mixed() }),
})

export type Api = yup.InferType<typeof Api>
