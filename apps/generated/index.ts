import * as z from 'zod'

type AnimalType = { name: string; species: string; offspring?: AnimalType[] }
type SchemaType = AnimalType

export const Animal: z.ZodType<AnimalType> = z.strictObject({
  name: z.string(),
  species: z.string(),
  offspring: z.array(z.lazy(() => Animal)).optional(),
})

export const Schema: z.ZodType<SchemaType> = z.lazy(() => Animal)

export type Schema = z.infer<typeof Schema>
