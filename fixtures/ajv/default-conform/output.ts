import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {
  type: 'object',
  properties: {
    precision: {},
    mode: {},
    fallbackMode: {},
    ratio: { type: 'number' },
    count: { type: 'integer' },
    attachments: { type: 'string' },
  },
}

export const validate = ajv.compile(schema)
