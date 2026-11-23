# AGENTS.md

Instructions for coding agents working on this repository. It is a pnpm workspace of npm packages, built and tested through Bazel; the layout, the commands and the release procedure are in [README.md](./README.md). Read it first.

## Rules

The detailed conventions live in [`docs/rules/`](./docs/rules), one directory per package. Read the files that match what you are about to touch before editing it. They were written when each package was its own repository, so a path such as `npm/schema-truth/...` is still right, while a root file they name (`vite.config.ts`, `cspell.json`, the workflows) now means the one at the root of this repository.

| When you touch                                          | Read                                                                                                                                                                                                      | Covers                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Always                                                  | [schema-truth/repo-map.md](./docs/rules/schema-truth/repo-map.md), [schema-truth/pull-requests.md](./docs/rules/schema-truth/pull-requests.md), [oas-truth/project.md](./docs/rules/oas-truth/project.md) | the repository map, invariants, the definition of done, and how a change lands    |
| `npm/schema-truth/**/*.ts`                              | [schema-truth/typescript-style.md](./docs/rules/schema-truth/typescript-style.md)                                                                                                                         | TypeScript conventions the oxlint configuration implies                           |
| `npm/schema-truth/src/{generator,helper,utils}/**`      | [schema-truth/generators.md](./docs/rules/schema-truth/generators.md), [schema-truth/target-libraries.md](./docs/rules/schema-truth/target-libraries.md)                                                  | writing a generator; the target library versions and their docs                   |
| an `x-*` vendor extension                               | [schema-truth/vendor-extensions.md](./docs/rules/schema-truth/vendor-extensions.md)                                                                                                                       | how an extension is declared, emitted and documented                              |
| `fixtures/**`, `apps/generated/**`                      | [schema-truth/fixtures.md](./docs/rules/schema-truth/fixtures.md)                                                                                                                                         | the fixture layout and how outputs are regenerated                                |
| `npm/oas-truth/src/**/*.ts`                             | [oas-truth/architecture.md](./docs/rules/oas-truth/architecture.md), [oas-truth/typescript.md](./docs/rules/oas-truth/typescript.md)                                                                      | layering, dependency direction and the public API; TypeScript conventions         |
| `**/*.test.ts`                                          | [schema-truth/tests.md](./docs/rules/schema-truth/tests.md), [oas-truth/testing.md](./docs/rules/oas-truth/testing.md)                                                                                    | test conventions for the vitest suites                                            |
| `.github/**`, `lint/**`, package and lint configuration | [schema-truth/github-actions.md](./docs/rules/schema-truth/github-actions.md), [oas-truth/ci-config.md](./docs/rules/oas-truth/ci-config.md)                                                              | the workflows, what actionlint and zizmor expect, dependency pinning              |
| `**/*.md`                                               | [schema-truth/writing-docs.md](./docs/rules/schema-truth/writing-docs.md), [oas-truth/docs.md](./docs/rules/oas-truth/docs.md)                                                                            | what markdownlint, textlint and cspell enforce, and how to answer them            |
| a recurring oas-truth task                              | [oas-truth/playbooks.md](./docs/rules/oas-truth/playbooks.md)                                                                                                                                             | step by step: a component builder, a validator library, a lint failure, a release |

## The short version

```sh
vp install --frozen-lockfile
pnpm fix              # formatting, oxlint, markdownlint, textlint autofixes
bazel test //...      # build, tests and the fixtures' type checks, every package
pnpm check            # format check, per-package vp check, repository linters
```

`bazel test //...` and `pnpm check` are exactly what CI runs; both must pass before a change is finished. `pnpm lint` runs zizmor through uvx, so install [uv](https://docs.astral.sh/uv/) once; it fails rather than skips without it.

## Workflow

1. Read the rule files that match what you are about to touch (the table above) before editing, including the workflow rules before touching `.github/`.
2. Run `pnpm fix`, then `bazel test //...` and `pnpm check` locally. A check that cannot run here is a problem to fix, not one to leave for CI.
3. Push and open the pull request ([pull-requests.md](./docs/rules/schema-truth/pull-requests.md)), then watch it with `gh pr checks <number> --watch`. A change is finished when every check on the pull request is green, not when it is pushed; a red check is fixed on the same branch.
4. One topic per pull request. Work that builds on an open pull request is stacked on its branch (`--base <branch>`), and GitHub retargets it to `main` when the base merges.

## Invariants

- Never relax a linter to get a change through. An exception lives next to the code as an `oxlint-disable-next-line` with a reason, never as `'off'` in a config.
- Unused code is deleted, not ignored. `pnpm knip` fails on an unused file, dependency or export; an entry in `knip.jsonc` is only for what the import graph cannot see, with its reason beside it.
- Never change what a generator emits without saying so in the pull request: every consumer's output changes with it, and `oas-truth` emits schemas through `schema-truth`, so its tests pin the sibling's output too. Regenerate and commit the fixtures in the same change.
- `oas-truth` depends on `schema-truth` as `workspace:^`. Do not pin a published version there; `pnpm publish` rewrites the range at release time.
- A new npm package goes under `npm/<name>` with a `BUILD.bazel` modelled on its siblings, a `package.json` entry in `MODULE.bazel`'s `data` list, and its `node_modules` line in `.bazelignore`. Anything that must not be published is `"private": true`.
- Dependencies change through `pnpm` (then `vp install`), never by hand in the lockfile. Bazel reads `pnpm-lock.yaml`; there is no second list to keep in sync.
- A pull request that changes what `schema-truth` or `oas-truth` ships adds a changeset (`pnpm changeset`, see [`.changeset/README.md`](./.changeset/README.md)). Never edit `version` or a `CHANGELOG.md` by hand: the Version Packages pull request that `release.yml` opens writes both, and `release.yml` merges and publishes it on its own, so merging a pull request with a changeset releases it.
- Everything committed is written in English.
