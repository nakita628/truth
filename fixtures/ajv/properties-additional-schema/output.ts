import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name'],
}

export const validate = ajv.compile(schema)
