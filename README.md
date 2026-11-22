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
pnpm lint                      # markdownlint, textlint, cspell, secretlint, actionlint, knip, dead links
pnpm knip                      # unused files, dependencies and exports across every workspace
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

Releases go through [Changesets](https://github.com/changesets/changesets), the way [honojs/middleware](https://github.com/honojs/middleware) runs them, except that nobody has to approve or merge the release:

1. A pull request that changes what a published package ships adds a changeset: `pnpm changeset`, pick the packages and the bump, write the line for the changelog. It is a Markdown file under [`.changeset/`](./.changeset/README.md), reviewed with the change. Tests, fixtures, docs and CI need none.
2. When Test passes on `main`, [release.yml](./.github/workflows/release.yml) opens or updates the **Version Packages** pull request, which applies every pending changeset: the versions in `npm/<name>/package.json`, each package's `CHANGELOG.md`, and the changeset files deleted. It then squash-merges that pull request itself, with no approval.
3. That merge is the release. GitHub starts no workflow for a merge made with the workflow's token, so `release.yml` starts itself on `main`; that run runs Test on the merge and, once it passes, publishes every package whose version is not on npm yet (`pnpm -r publish`, with provenance through npm trusted publishing from the `release` environment), then tags `<name>@<version>` and creates the GitHub release with that version's changelog section.

So a pull request with a changeset is released when it merges. The jobs hold separate permissions: the Version Packages job can write a branch and a pull request, and the job that merges it runs nothing but `gh`; neither sees the npm OIDC token, and the publish job can publish but not write to the repository. Do not edit a version by hand or publish from a laptop; to fix a bad release, add a changeset and release again. If a release run fails, fix the cause and re-run its failed jobs, or start `release.yml` on `main` from the Actions tab: it tests `main` and publishes whatever npm does not have yet.

### Repository settings

The release and the hourly Issue loop rely on settings that live in the repository's settings rather than in its files. The Issue loop is a scheduled Claude Code session: each hour it takes the oldest open issue opened by the owner or labelled `claude`, works on it on an `issue-<number>` branch, opens a pull request, has it reviewed and squash-merges it once CI passes.

| Setting                                                                                                | Why                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Actions → General → Workflow permissions**: Allow GitHub Actions to create and approve pull requests | `release.yml` opens the Version Packages pull request with the workflow's token                                                                                                      |
| **General → Pull Requests**: Allow squash merging                                                      | the Version Packages pull request and the Issue loop's pull requests are squash-merged                                                                                               |
| **General → Pull Requests**: Automatically delete head branches                                        | a merged pull request's branch goes with it; [delete-closed-branch.yml](./.github/workflows/delete-closed-branch.yml) deletes the branch of one closed without merging               |
| No branch protection rule or ruleset on `main` that requires an approving review or a status check     | the Version Packages pull request gets no review and no Test run of its own (GitHub starts none for the workflow's token); `release.yml` tests the merge on `main` before publishing |
| **Environments → `release`**: deployment branches limited to `main`, no required reviewers             | only `main` reaches the npm OIDC token, and no publish waits for an approval                                                                                                         |
| A `claude` label                                                                                       | hands an issue someone else opened to the Issue loop                                                                                                                                 |

The owner applies them with the commands below. The `PUT` on the environment replaces its protection rules, so it also drops a required reviewer or a wait timer.

```sh
gh api -X PUT repos/nakita628/truth/actions/permissions/workflow -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true
gh api -X PATCH repos/nakita628/truth -F allow_squash_merge=true -F delete_branch_on_merge=true
gh api -X PUT repos/nakita628/truth/environments/release --input - <<<'{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}'
gh api -X POST repos/nakita628/truth/environments/release/deployment-branch-policies -f name=main -f type=branch
gh label create claude -R nakita628/truth --description "Hand this issue to the Issue loop"
```

## Contributing

Pull requests follow [the template](./.github/pull_request_template.md). CI is `pnpm check` plus `bazel test //...`; both must pass. The conventions the linters enforce, and the reasons behind them, are in [AGENTS.md](./AGENTS.md) and the per-package rule files under `.cursor/rules/`.

## License

[MIT](./LICENSE)
