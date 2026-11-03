import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {
  type: 'object',
  properties: { a: { type: 'string' }, list: {}, kind: { type: 'string' } },
}

export const validate = ajv.compile(schema)
