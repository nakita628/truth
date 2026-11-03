import { type } from 'arktype'

export const Address = type({ 'country?': 'string' }).narrow(
  (data) =>
    !type({ 'country?': "'JP'" }).allows(data) ||
    type({ postalCode: type('string').and(/^[0-9]{3}-[0-9]{4}$/) }).allows(data),
)

export type Address = typeof Address.infer
