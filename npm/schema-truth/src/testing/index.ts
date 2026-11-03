import type { Effect as EffectType, FileSystem } from 'effect'
import { Effect } from 'effect'

import { fileSystemLayer } from '../file/index.js'

/**
 * Runs an Effect against the real filesystem, the way the CLI does, and answers with
 * what it produced.
 *
 * Test-only — nothing in `dist` imports it.
 */
export function runGenerator<A, E>(effect: EffectType.Effect<A, E, FileSystem.FileSystem>) {
  return Effect.runPromise(effect.pipe(Effect.provide(fileSystemLayer)))
}

/** The same, for an Effect that is expected to fail: answers with the error it failed with. */
export function runGeneratorError<A, E>(effect: EffectType.Effect<A, E, FileSystem.FileSystem>) {
  return Effect.runPromise(Effect.flip(effect.pipe(Effect.provide(fileSystemLayer))))
}
