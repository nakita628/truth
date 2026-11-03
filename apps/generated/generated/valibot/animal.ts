import * as v from 'valibot'

type _Schema = _Animal

type _Animal = { name: string; species: string; offspring?: _Animal[] }

const Animal: v.GenericSchema<unknown, _Animal> = v.pipe(
  v.strictObject({
    name: v.pipe(v.string(), v.description('The name of the animal')),
    species: v.pipe(v.string(), v.description('The species of the animal')),
    offspring: v.optional(
      v.pipe(v.array(v.lazy(() => Animal)), v.description('List of child animals')),
    ),
  }),
  v.description('An animal that can have offspring'),
)

export const Schema: v.GenericSchema<unknown, _Schema> = v.lazy(() => Animal)
