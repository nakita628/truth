import * as v from 'valibot'

type _Connections = _Connection[]

type _ConnectionBase = { name?: string; type?: 'Sample' | 'Kafka' }

type _KafkaConnection = _ConnectionBase & { bootstrapServers?: string }

type _SampleConnection = _ConnectionBase

type _Connection = _SampleConnection | _KafkaConnection

const ConnectionBase: v.GenericSchema<unknown, _ConnectionBase> = v.partial(
  v.object({ name: v.string(), type: v.picklist(['Sample', 'Kafka']) }),
)

const KafkaConnection: v.GenericSchema<unknown, _KafkaConnection> = v.intersect([
  v.lazy(() => ConnectionBase),
  v.partial(v.object({ bootstrapServers: v.string() })),
])

const SampleConnection: v.GenericSchema<unknown, _SampleConnection> = v.lazy(() => ConnectionBase)

const Connection: v.GenericSchema<unknown, _Connection> = v.union([
  v.intersect([v.lazy(() => SampleConnection), v.object({ type: v.literal('Sample') })]),
  v.intersect([v.lazy(() => KafkaConnection), v.object({ type: v.literal('Kafka') })]),
])

export const Connections: v.GenericSchema<unknown, _Connections> = v.array(v.lazy(() => Connection))

export type ConnectionsOutput = v.InferOutput<typeof Connections>
