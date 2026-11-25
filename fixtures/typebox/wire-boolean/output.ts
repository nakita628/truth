import { Codec, Type, type Static } from 'typebox'

export const Query = Type.Object({
  active: Codec(
    Type.String({
      pattern:
        '^(?:[Tt][Rr][Uu][Ee]|1|[Yy][Ee][Ss]|[Oo][Nn]|[Yy]|[Ee][Nn][Aa][Bb][Ll][Ee][Dd]|[Ff][Aa][Ll][Ss][Ee]|0|[Nn][Oo]|[Oo][Ff][Ff]|[Nn]|[Dd][Ii][Ss][Aa][Bb][Ll][Ee][Dd])$',
    }),
  )
    .Decode((value) => /^(?:true|1|yes|on|y|enabled)$/i.test(value))
    .Encode((value) => (value ? 'true' : 'false')),
})

export type Query = Static<typeof Query>
