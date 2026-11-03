import * as yup from 'yup'

export const Tagged = yup.object({ name: yup.string().required() })

export type Tagged = yup.InferType<typeof Tagged>
