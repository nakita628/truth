import { scope } from 'arktype'

const types = scope({
  Animal: { name: 'string', species: 'string', 'offspring?': 'Animal[]', '+': 'reject' },
  Comment: { author: 'string', text: 'string', 'replies?': 'Comment[]', '+': 'reject' },
  Folder: { name: 'string', 'children?': 'Folder[]', '+': 'reject' },
  Person: { name: 'string', position: 'string', 'subordinates?': 'Person[]', '+': 'reject' },
  SelfReferencingEntities: [
    {
      'animal?': 'Animal',
      'person?': 'Person',
      'folder?': 'Folder',
      'comment?': 'Comment',
      '+': 'reject',
    },
    '@',
    'Examples of animal, person, folder, and comment structures with self-references.',
  ],
}).export()

export const SelfReferencingEntities = types.SelfReferencingEntities
