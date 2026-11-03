import * as yup from 'yup'

export const Item = yup.object({ detail: yup.mixed() })

export type Item = yup.InferType<typeof Item>
