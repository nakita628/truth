import { type } from 'arktype'

export const DependentRequired = type({ 'kind?': 'string', 'feature?': 'string' }).narrow(
  (data) => !('kind' in data) || 'feature' in data,
)

export type DependentRequired = typeof DependentRequired.infer
