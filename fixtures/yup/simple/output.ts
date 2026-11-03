import * as yup from 'yup'

export const Schema = yup.object({
  name: yup.string().required(),
  email: yup.string().email().required(),
  age: yup.number().integer().min(0),
})

export type Schema = yup.InferType<typeof Schema>
