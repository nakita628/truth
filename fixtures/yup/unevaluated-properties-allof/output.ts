import * as yup from 'yup'

export const Bucket = yup.object({})

export type Bucket = yup.InferType<typeof Bucket>
