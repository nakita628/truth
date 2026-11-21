# Changesets

A changeset is a Markdown file in this directory that says which published packages a pull request changes, how far each one moves (`patch`, `minor` or `major`), and the line that goes into their `CHANGELOG.md`. Add one with `pnpm changeset` in every pull request that changes what `schema-truth` or `oas-truth` ships; a change to tests, fixtures, docs or CI needs none.

```md
---
'schema-truth': patch
---

Emit `Schema.isBetweenLength` for an array with `minItems` equal to `maxItems`.
```

Write the summary for someone reading the changelog: what changed for a user of the package, in one or two sentences. While both packages are `0.x`, a breaking change is a `minor`.

After a merge to `main`, [release.yml](../.github/workflows/release.yml) opens or updates the **Version Packages** pull request, which applies every pending changeset: it bumps the versions, writes the changelogs and deletes the files. Merging that pull request is the release. See [Releasing](../README.md#releasing).
