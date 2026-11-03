import * as v from 'valibot'

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

const Animal: v.GenericSchema<unknown, _Animal> = v.strictObject({
  name: v.string(),
  species: v.string(),
  offspring: v.optional(v.array(v.lazy(() => Animal))),
})

const Comment: v.GenericSchema<unknown, _Comment> = v.strictObject({
  author: v.string(),
  text: v.string(),
  replies: v.optional(v.array(v.lazy(() => Comment))),
})

const Folder: v.GenericSchema<unknown, _Folder> = v.strictObject({
  name: v.string(),
  children: v.optional(v.array(v.lazy(() => Folder))),
})

const Person: v.GenericSchema<unknown, _Person> = v.strictObject({
  name: v.string(),
  position: v.string(),
  subordinates: v.optional(v.array(v.lazy(() => Person))),
})

export const SelfReferencingEntities: v.GenericSchema<unknown, _SelfReferencingEntities> = v.pipe(
  v.partial(
    v.strictObject({
      animal: v.lazy(() => Animal),
      person: v.lazy(() => Person),
      folder: v.lazy(() => Folder),
      comment: v.lazy(() => Comment),
    }),
  ),
  v.description('Examples of animal, person, folder, and comment structures with self-references.'),
)
