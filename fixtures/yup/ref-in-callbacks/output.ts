import * as yup from 'yup'

export const Doc = yup.object({ a: yup.string(), list: yup.mixed(), kind: yup.string() })

export type Doc = yup.InferType<typeof Doc>
