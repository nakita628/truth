import { Codec, Type, type Static } from 'typebox'

export const Name = Codec(Type.String({ ref: 'Name' }))
  .Decode((value: string) => value.trim())
  .Encode((value: string) => value)

export type Name = Static<typeof Name>
