import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    spec: { type: 'object', properties: { tags: {}, root: {} } },
  },
  required: ['name'],
}

export const validate = ajv.compile(schema)
