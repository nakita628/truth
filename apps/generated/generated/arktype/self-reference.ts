import { scope } from 'arktype'

const types = scope({
  Node: { name: 'string', 'children?': 'Node[]', '+': 'reject' },
  Schema: 'Node',
}).export()

export const Schema = types.Schema
