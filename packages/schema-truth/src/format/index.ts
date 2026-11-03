import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { format } from 'oxfmt'

/** oxfmt rejected the source it was handed. */
export class FormatError extends Data.TaggedError('FormatError')<{
  readonly message: string
}> {}

const FMT_OPTIONS = {
  printWidth: 100,
  singleQuote: true,
  semi: false,
} as const

/** Formats generated TypeScript. Failures land in the error channel. */
export function fmt(input: string) {
  return Effect.gen(function* () {
    const { code, errors } = yield* Effect.tryPromise({
      try: () => format('<stdin>.ts', input, FMT_OPTIONS),
      catch: (cause) =>
        new FormatError({ message: cause instanceof Error ? cause.message : String(cause) }),
    })
    if (errors.length > 0) {
      return yield* new FormatError({ message: errors.map((error) => error.message).join('\n') })
    }
    return code
  })
}
