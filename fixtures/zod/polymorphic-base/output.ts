import * as z from 'zod'

type _Connections = _Connection[]

type _ConnectionBase = { name?: string; type?: 'Sample' | 'Kafka' }

type _KafkaConnection = _ConnectionBase & { bootstrapServers?: string }

type _SampleConnection = _ConnectionBase

type _Connection = _SampleConnection | _KafkaConnection

const ConnectionBase: z.ZodType<_ConnectionBase> = z.object({
  name: z.string().exactOptional(),
  type: z.enum(['Sample', 'Kafka']).exactOptional(),
})

const KafkaConnection: z.ZodType<_KafkaConnection> = z.intersection(
  z.lazy(() => ConnectionBase),
  z.object({ bootstrapServers: z.string().exactOptional() }),
)

const SampleConnection: z.ZodType<_SampleConnection> = z.lazy(() => ConnectionBase)

const Connection: z.ZodType<_Connection> = z.xor([
  z.intersection(
    z.lazy(() => SampleConnection),
    z.object({ type: z.literal('Sample') }),
  ),
  z.intersection(
    z.lazy(() => KafkaConnection),
    z.object({ type: z.literal('Kafka') }),
  ),
])

export const Connections: z.ZodType<_Connections> = z.array(z.lazy(() => Connection))

export type Connections = z.infer<typeof Connections>
