import * as z from 'zod'

type _Organization = {
  id: string
  name: string
  members?: _Member[]
  parent?: z.infer<typeof Organization>
}

type _Member = {
  userId: string
  role: 'admin' | 'member' | 'guest'
  joinedAt: string
  invitedBy?: _Member
}

const Member: z.ZodType<_Member> = z
  .strictObject({
    userId: z.uuid().meta({ description: 'The unique identifier of the user.' }),
    role: z
      .enum(['admin', 'member', 'guest'])
      .meta({ description: 'The role of the user in the organization.' }),
    joinedAt: z.iso
      .datetime({ offset: true })
      .meta({ description: 'The timestamp when the user joined the organization.' }),
    invitedBy: z
      .lazy(() => Member)
      .meta({ description: 'The member who invited this user (recursive reference).' })
      .exactOptional(),
  })
  .meta({ description: 'A person who is a member of the organization.' })

export const Organization: z.ZodType<_Organization> = z
  .strictObject({
    id: z.uuid().meta({ description: 'The UUID of the organization.' }),
    name: z.string().min(1).meta({ description: 'The name of the organization.' }),
    members: z
      .array(z.lazy(() => Member))
      .meta({ description: 'A list of members belonging to the organization.' })
      .exactOptional(),
    parent: z
      .lazy(() => Organization)
      .meta({ description: 'An optional reference to a parent organization (recursive).' })
      .exactOptional(),
  })
  .meta({ description: 'A recursive schema representing an organization and its members.' })
