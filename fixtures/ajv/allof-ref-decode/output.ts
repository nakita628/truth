import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = { type: 'object', properties: { detail: {} } }

export const validate = ajv.compile(schema)
