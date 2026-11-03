# truth

A monorepo of the `*-truth` packages: generators and parsers that treat a JSON Schema, OpenAPI or TypeSpec document as the single source of truth.

| Package                              | npm                                                                                                 | What it does                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`schema-truth`](./npm/schema-truth) | [![npm](https://img.shields.io/npm/v/schema-truth.svg)](https://www.npmjs.com/package/schema-truth) | Generates Zod, Valibot, Effect Schema, TypeBox, ArkType, Ajv and Yup schemas from JSON Schema   |
| [`oas-truth`](./npm/oas-truth)       | [![npm](https://img.shields.io/npm/v/oas-truth.svg)](https://www.npmjs.com/package/oas-truth)       | Reads OpenAPI and TypeSpec into a typed OpenAPI document and emits schemas through schema-truth |

Each package has its own README with installation and usage. This file is about the repository.

## Layout

```text
npm/             the published npm packages, one directory per package
fixtures/        schema-truth's generator fixtures: input.json + the committed output.ts per case,
                 type-checked against the real target library and asserted on byte for byte
apps/generated   a sample consumer that runs the schema-truth CLIs and type-checks what they emit
MODULE.bazel     the Bazel module: rules_js over pnpm-lock.yaml, the Node toolchain
BUILD.bazel      one per package, next to its package.json
vite.config.ts   the formatting style every package inherits (Vite+ merges it into theirs)
```

Dependencies are a [pnpm workspace](./pnpm-workspace.yaml); `pnpm-lock.yaml` is the single lockfile and the one Bazel reads. `oas-truth` depends on `schema-truth` as `workspace:^`, so it is always built and tested against the sibling in the same commit.

## Commands

```sh
vp install --frozen-lockfile   # dependencies (vp is vite-plus: https://viteplus.dev)
bazel test //...               # build, test and type-check every package
bazel build //npm/schema-truth:build   # one package's dist, under bazel-bin/
pnpm check                     # format check (vp fmt), per-package vp check, repository linters
pnpm fix                       # the autofixable part of the above
pnpm lint                      # markdownlint, textlint, cspell, secretlint, actionlint, dead links
```

Bazel runs the same tools the packages always used, `vp pack` / `vp test` / `tsc`, as hermetic, cached actions: a change under `npm/schema-truth` reruns its tests, the fixtures and `oas-truth`; a change to a README reruns nothing. The targets of a package are listed in its `BUILD.bazel`:

| Target                                | Runs                                                               |
| ------------------------------------- | ------------------------------------------------------------------ |
| `//npm/<name>:build`                  | `vp pack` into `dist/`                                             |
| `//npm/<name>:<name>`                 | the package as `npm publish` ships it (what siblings link against) |
| `//npm/<name>:test`                   | `vp test` (vitest)                                                 |
| `//fixtures:<lib>_typecheck`, `_test` | `tsc --noEmit` over every `output.ts`; the fixture assertions      |
| `//apps/generated:typecheck`          | `tsc --noEmit`                                                     |

To regenerate the fixtures after changing a generator, build `schema-truth` and run the fixture's `generate` script (`vp run @fixtures/zod#generate`); commit the new `output.ts` files with the change that caused them.

`vp check` (oxfmt, type-aware oxlint, type check) stays outside Bazel, as `pnpm check` runs it: oxfmt skips symlinked files, and a Bazel runfiles tree is nothing but symlinks.

## Releasing

There are no changesets, release notes or GitHub releases. Bump `version` in `npm/<name>/package.json` in the pull request that needs it (or in one of its own) and merge. When the Test workflow passes on `main`, [release.yml](./.github/workflows/release.yml) runs `pnpm -r publish`, which publishes every package whose version is not on npm yet, with provenance through npm trusted publishing. A merge that bumps nothing publishes nothing.

## Contributing

Pull requests follow [the template](./.github/pull_request_template.md). CI is `pnpm check` plus `bazel test //...`; both must pass. The conventions the linters enforce, and the reasons behind them, are in [AGENTS.md](./AGENTS.md) and the per-package rule files under `.cursor/rules/`.

## License

[MIT](./LICENSE)
