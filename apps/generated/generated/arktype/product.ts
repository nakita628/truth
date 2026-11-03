import { type } from 'arktype'

export const Product = type({
  id: type('number.integer').describe('The unique identifier for a product'),
  name: type('string').describe('Name of the product'),
  price: 'number > 0',
  'tags?': 'string[]',
  'dimensions?': type({ length: 'number', width: 'number', height: 'number' }),
  'warehouseLocation?': type('string').describe('Coordinates of the warehouse'),
})
