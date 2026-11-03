import { Schema } from 'effect'

type _SelfReferencingEntities = {
  readonly animal?: _Animal
  readonly person?: _Person
  readonly folder?: _Folder
  readonly comment?: _Comment
}

type _Animal = {
  readonly name: string
  readonly species: string
  readonly offspring?: readonly _Animal[]
}

type _Comment = {
  readonly author: string
  readonly text: string
  readonly replies?: readonly _Comment[]
}

type _Folder = { readonly name: string; readonly children?: readonly _Folder[] }

type _Person = {
  readonly name: string
  readonly position: string
  readonly subordinates?: readonly _Person[]
}

const Animal: Schema.Schema<_Animal> = Schema.StructWithRest(
  Schema.Struct({
    name: Schema.String,
    species: Schema.String,
    offspring: Schema.optional(Schema.Array(Schema.suspend(() => Animal))),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).check(
  Schema.makeFilter((input) =>
    Object.keys(input).every((key) => ['name', 'species', 'offspring'].includes(key)),
  ),
)

const Comment: Schema.Schema<_Comment> = Schema.StructWithRest(
  Schema.Struct({
    author: Schema.String,
    text: Schema.String,
    replies: Schema.optional(Schema.Array(Schema.suspend(() => Comment))),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).check(
  Schema.makeFilter((input) =>
    Object.keys(input).every((key) => ['author', 'text', 'replies'].includes(key)),
  ),
)

const Folder: Schema.Schema<_Folder> = Schema.StructWithRest(
  Schema.Struct({
    name: Schema.String,
    children: Schema.optional(Schema.Array(Schema.suspend(() => Folder))),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).check(
  Schema.makeFilter((input) =>
    Object.keys(input).every((key) => ['name', 'children'].includes(key)),
  ),
)

const Person: Schema.Schema<_Person> = Schema.StructWithRest(
  Schema.Struct({
    name: Schema.String,
    position: Schema.String,
    subordinates: Schema.optional(Schema.Array(Schema.suspend(() => Person))),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).check(
  Schema.makeFilter((input) =>
    Object.keys(input).every((key) => ['name', 'position', 'subordinates'].includes(key)),
  ),
)

export const SelfReferencingEntities: Schema.Schema<_SelfReferencingEntities> =
  Schema.StructWithRest(
    Schema.Struct({
      animal: Schema.optional(Schema.suspend(() => Animal)),
      person: Schema.optional(Schema.suspend(() => Person)),
      folder: Schema.optional(Schema.suspend(() => Folder)),
      comment: Schema.optional(Schema.suspend(() => Comment)),
    }),
    [Schema.Record(Schema.String, Schema.Unknown)],
  )
    .check(
      Schema.makeFilter((input) =>
        Object.keys(input).every((key) => ['animal', 'person', 'folder', 'comment'].includes(key)),
      ),
    )
    .annotate({
      description:
        'Examples of animal, person, folder, and comment structures with self-references.',
    })
