import { type } from 'arktype'

export const DependentRequired = type({ 'kind?': 'string', 'feature?': 'string' }).narrow(
  (data) => !Object.hasOwn(data, 'kind') || Object.hasOwn(data, 'feature'),
)

export type DependentRequired = typeof DependentRequired.infer
