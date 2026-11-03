import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {
  type: 'object',
  properties: { a: { type: 'string' } },
  required: ['a', 'kind'],
}

export const validate = ajv.compile(schema)
