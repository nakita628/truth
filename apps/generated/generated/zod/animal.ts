import * as z from 'zod'

type _Schema = _Animal

type _Animal = { name: string; species: string; offspring?: _Animal[] }

const Animal: z.ZodType<_Animal> = z
  .strictObject({
    name: z.string().meta({ description: 'The name of the animal' }),
    species: z.string().meta({ description: 'The species of the animal' }),
    offspring: z
      .array(z.lazy(() => Animal))
      .meta({ description: 'List of child animals' })
      .exactOptional(),
  })
  .meta({ description: 'An animal that can have offspring' })

export const Schema: z.ZodType<_Schema> = z.lazy(() => Animal)
