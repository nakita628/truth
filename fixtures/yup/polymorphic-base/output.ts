import * as yup from 'yup'

export const Connections = yup.mixed()

export type Connections = yup.InferType<typeof Connections>
