import * as Effect from 'effect/Effect'

/** Parses a JSON string. Failures land in the error channel. */
export function parseJson(raw: string) {
  return Effect.try({
    try: (): unknown => JSON.parse(raw),
    catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
  })
}
