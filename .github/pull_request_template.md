<!--
Title: `type(scope): summary` — imperative mood, no trailing period; it is what `git log`
shows, so write it for the person reading the history.

  type   feat | fix | perf | refactor | docs | test | build | ci | chore
  scope  schema-truth | oas-truth | zod | valibot | effect | typebox | arktype | ajv | yup | cli | parser | fixtures | docs | ci | bazel

  fix(valibot): emit valid schemas for null and object enum members
-->

## Why

<!-- The bug, the missing capability or the request behind this change. Link the issue: `Closes #123`. -->

## What

<!-- What changed, as a user of the package sees it. One to three sentences. -->

## Where

<!-- Scope: the generators, parser, CLI, fixtures or docs touched. Name what is deliberately left out. -->

## Who

<!-- Who notices: every user, users of one target library, contributors only. Breaking for anyone? -->

## When

<!-- Release impact: `none` | `next release` | `version bumped to x.y.z — publishes to npm on merge`. -->

## How

<!--
The approach in a sentence, then the evidence. If a generator changed, paste the interesting
part of the `fixtures/*/*/output.ts` diff, or say that generated output is unchanged.
Tick only what you ran; paste the output of anything that failed.
-->

<!-- textlint-disable no-todo -->

- [ ] `pnpm check`
- [ ] `bazel test //...`

<!-- textlint-enable no-todo -->
