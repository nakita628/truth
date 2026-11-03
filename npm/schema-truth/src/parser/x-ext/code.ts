/**
 * C 層: Code-emitting vendor extensions (escape hatch).
 *
 * Values are complete validator-specific TS expression fragments that are
 * appended verbatim to the generated schema. **DANGEROUS** — only honored
 * when the programmatic API is called with `{ unsafeCodeExtensions: true }`
 * and the value passes the denylist check in `helper/code-extensions.ts`.
 * Treat untrusted JSON Schemas as unsafe.
 *
 * @see helper/code-extensions.ts for the denylist and `readCodeExtension`.
 */
export type XExtCode = {
  // Zod
  /** Zod-only: `.refine(...)` chain fragment appended verbatim */
  readonly 'x-refine'?: string
  /** Zod-only: `.superRefine(...)` chain fragment appended verbatim */
  readonly 'x-superRefine'?: string
  /** Zod-only: complete `z.codec(...)` expression that replaces the base schema */
  readonly 'x-codec'?: string
  /** Zod-only: complete `z.preprocess(...)` expression that replaces the base schema */
  readonly 'x-preprocess'?: string

  // Shared (Zod / Valibot / Effect / Arktype)
  /** Complete transform expression that replaces the base schema */
  readonly 'x-transform'?: string
  /** Complete `.pipe(...)` expression appended verbatim */
  readonly 'x-pipe'?: string

  // Valibot
  /** Valibot-only: `.check(...)` fragment appended verbatim */
  readonly 'x-check'?: string

  // Effect
  /** Effect-only: `.filter(...)` fragment appended verbatim */
  readonly 'x-filter'?: string

  // Arktype
  /** Arktype-only: `.narrow(...)` fragment appended verbatim */
  readonly 'x-narrow'?: string
  /** Arktype-only: `.morph(...)` fragment appended verbatim */
  readonly 'x-morph'?: string
}
