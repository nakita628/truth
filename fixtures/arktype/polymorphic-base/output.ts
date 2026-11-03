import { scope } from 'arktype'

const types = scope({
  ConnectionBase: { 'name?': 'string', 'type?': "'Sample' | 'Kafka'" },
  KafkaConnection: ['ConnectionBase', '&', { 'bootstrapServers?': 'string' }],
  SampleConnection: 'ConnectionBase',
  Connection: [
    ['SampleConnection', '&', { type: "'Sample'" }],
    '|',
    ['KafkaConnection', '&', { type: "'Kafka'" }],
  ],
  Connections: 'Connection[]',
}).export()

export const Connections = types.Connections

export type Connections = typeof Connections.infer
