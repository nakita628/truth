# AGENTS.md

Instructions for coding agents working on this repository. It is a pnpm workspace of npm packages, built and tested through Bazel; the layout, the commands and the release procedure are in [README.md](./README.md). Read it first.

## Rules

The detailed conventions live in `.cursor/rules/`, one directory per package, and are also read automatically by Cursor. They were written when each package was its own repository, so a path such as `npm/schema-truth/...` is still right, while a root file they name (`vite.config.ts`, `cspell.json`, the workflows) now means the one at the root of this repository.

| Directory                     | Applies to                                 | Covers                                                                                                               |
| ----------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `.cursor/rules/schema-truth/` | `npm/schema-truth`, `fixtures/*`, `apps/*` | repository map, generators, target libraries, fixtures, tests, TypeScript style, docs, GitHub Actions, pull requests |
| `.cursor/rules/oas-truth/`    | `npm/oas-truth`                            | project, architecture, TypeScript, testing, docs, CI config, playbooks                                               |

## The short version

```sh
vp install --frozen-lockfile
pnpm fix              # formatting, oxlint, markdownlint, textlint autofixes
bazel test //...      # build, tests and the fixtures' type checks, every package
pnpm check            # format check, per-package vp check, repository linters
```

`bazel test //...` and `pnpm check` are exactly what CI runs; both must pass before a change is finished.

## Invariants

- Never relax a linter to get a change through. An exception lives next to the code as an `oxlint-disable-next-line` with a reason, never as `'off'` in a config.
- Unused code is deleted, not ignored. `pnpm knip` fails on an unused file, dependency or export; an entry in `knip.jsonc` is only for what the import graph cannot see, with its reason beside it.
- Never change what a generator emits without saying so in the pull request: every consumer's output changes with it, and `oas-truth` emits schemas through `schema-truth`, so its tests pin the sibling's output too. Regenerate and commit the fixtures in the same change.
- `oas-truth` depends on `schema-truth` as `workspace:^`. Do not pin a published version there; `pnpm publish` rewrites the range at release time.
- A new npm package goes under `npm/<name>` with a `BUILD.bazel` modelled on its siblings, a `package.json` entry in `MODULE.bazel`'s `data` list, and its `node_modules` line in `.bazelignore`. Anything that must not be published is `"private": true`.
- Dependencies change through `pnpm` (then `vp install`), never by hand in the lockfile. Bazel reads `pnpm-lock.yaml`; there is no second list to keep in sync.
- A pull request that changes what `schema-truth` or `oas-truth` ships adds a changeset (`pnpm changeset`, see [`.changeset/README.md`](./.changeset/README.md)). Never edit `version` or a `CHANGELOG.md` by hand: the Version Packages pull request that `release.yml` opens writes both, and `release.yml` merges and publishes it on its own, so merging a pull request with a changeset releases it.
- Everything committed is written in English.
