import * as yup from 'yup'

export const Extended = yup.object({})

export type Extended = yup.InferType<typeof Extended>
