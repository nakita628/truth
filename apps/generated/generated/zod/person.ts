import * as z from 'zod'

type _SelfReferencingEntities = {
  animal?: _Animal
  person?: _Person
  folder?: _Folder
  comment?: _Comment
}

type _Animal = { name: string; species: string; offspring?: _Animal[] }

type _Comment = { author: string; text: string; replies?: _Comment[] }

type _Folder = { name: string; children?: _Folder[] }

type _Person = { name: string; position: string; subordinates?: _Person[] }

const Animal: z.ZodType<_Animal> = z.strictObject({
  name: z.string(),
  species: z.string(),
  offspring: z.array(z.lazy(() => Animal)).exactOptional(),
})

const Comment: z.ZodType<_Comment> = z.strictObject({
  author: z.string(),
  text: z.string(),
  replies: z.array(z.lazy(() => Comment)).exactOptional(),
})

const Folder: z.ZodType<_Folder> = z.strictObject({
  name: z.string(),
  children: z.array(z.lazy(() => Folder)).exactOptional(),
})

const Person: z.ZodType<_Person> = z.strictObject({
  name: z.string(),
  position: z.string(),
  subordinates: z.array(z.lazy(() => Person)).exactOptional(),
})

export const SelfReferencingEntities: z.ZodType<_SelfReferencingEntities> = z
  .strictObject({
    animal: z.lazy(() => Animal).exactOptional(),
    person: z.lazy(() => Person).exactOptional(),
    folder: z.lazy(() => Folder).exactOptional(),
    comment: z.lazy(() => Comment).exactOptional(),
  })
  .meta({
    description: 'Examples of animal, person, folder, and comment structures with self-references.',
  })
