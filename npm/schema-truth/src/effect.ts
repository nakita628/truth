#!/usr/bin/env node
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as NodeServices from '@effect/platform-node/NodeServices'
import * as Effect from 'effect/Effect'

import pkg from '../package.json' with { type: 'json' }
import { cli } from './cli/index.js'
import { schemaToEffect } from './generator/effect/index.js'

NodeRuntime.runMain(
  cli({
    name: 'schema-truth-effect',
    generator: schemaToEffect,
    description: 'Generate Effect Schema code from a JSON Schema document',
    version: pkg.version,
  }).pipe(Effect.provide(NodeServices.layer)),
)
