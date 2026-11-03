import { type } from 'arktype'

export const BrandedTypes = type({
  userId: type('string.uuid').brand('UserId'),
  email: type('string.email').brand('Email'),
  price: type('number >= 0').brand('Price'),
  quantity: type('number.integer >= 0').brand('Quantity'),
  tags: type('string[]').and(type('1 <= unknown[] <= 10')).brand('Tags'),
  name: 'string',
})

export type BrandedTypes = typeof BrandedTypes.infer
