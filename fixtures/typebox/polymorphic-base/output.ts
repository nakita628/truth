import { Type, type Static } from 'typebox'

const ConnectionBase = Type.Object({
  name: Type.Optional(Type.String()),
  type: Type.Optional(Type.Union([Type.Literal('Sample'), Type.Literal('Kafka')])),
})

const KafkaConnection = Type.Intersect([
  ConnectionBase,
  Type.Object({ bootstrapServers: Type.Optional(Type.String()) }),
])

const SampleConnection = ConnectionBase

const Connection = Type.Union([
  Type.Intersect([SampleConnection, Type.Object({ type: Type.Literal('Sample') })]),
  Type.Intersect([KafkaConnection, Type.Object({ type: Type.Literal('Kafka') })]),
])

export const Connections = Type.Array(Connection)

export type Connections = Static<typeof Connections>
