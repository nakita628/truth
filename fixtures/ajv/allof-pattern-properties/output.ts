import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = { type: 'object' }

export const validate = ajv.compile(schema)
