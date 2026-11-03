import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {}

export const validate = ajv.compile(schema)
