import { scope } from 'arktype'

const types = scope({
  Node: { 'children?': 'Node[]' },
  Tag: { 'label?': 'string' },
  Api: { name: 'string', 'spec?': { 'tags?': 'Tag[]', 'root?': 'Node' } },
}).export()

export const Api = types.Api

export type Api = typeof Api.infer
