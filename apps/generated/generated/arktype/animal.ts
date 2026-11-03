import { scope } from 'arktype'

const types = scope({
  Animal: [
    {
      name: ['string', '@', 'The name of the animal'],
      species: ['string', '@', 'The species of the animal'],
      'offspring?': ['Animal[]', '@', 'List of child animals'],
      '+': 'reject',
    },
    '@',
    'An animal that can have offspring',
  ],
  Schema: 'Animal',
}).export()

export const Schema = types.Schema
