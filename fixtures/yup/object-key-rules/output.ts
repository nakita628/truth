import * as yup from 'yup'

export const KeyRules = yup.object({ a: yup.string().required() })

export type KeyRules = yup.InferType<typeof KeyRules>
