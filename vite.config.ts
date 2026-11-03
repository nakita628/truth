import { defineConfig } from 'vite-plus'

export default defineConfig({
  build: {
    sourcemap: true,
  },
  // The fixture packages have no config of their own: each one generates its `output.ts`
  // files from the built schema-truth library and asserts on them, so they are run from here
  // (`bazel test //fixtures/...` runs the same files, one target per fixture).
  // `packages/schema-truth` and `packages/oas-truth` declare their own `test` blocks.
  test: {
    include: ['fixtures/*/src/*.test.ts'],
    testTimeout: 10_000,
  },
  // Single source of truth for formatting style. Vite+ merges this root config into every
  // workspace config, so each package inherits these options and only declares what is
  // specific to it (pack / test / lint).
  //
  // Keep `fmt.ignorePatterns` here specific enough that it matches nothing inside a
  // workspace: it is inherited too, and a broad root-relative pattern such as
  // `packages/**` makes the workspace's own `vp check` exclude every file. `fixtures/**`
  // is generator output committed for review; its bytes come from the generators' own
  // oxfmt pass.
  fmt: {
    printWidth: 100,
    singleQuote: true,
    semi: false,
    sortPackageJson: true,
    sortImports: {},
    // The bazel-* entries are the output symlinks Bazel leaves at the repository root; they
    // are root-relative on purpose, so that they match nothing when Bazel runs `vp check`
    // from a runfiles tree whose own path contains `bazel-out`.
    ignorePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      'bazel-bin/**',
      'bazel-out/**',
      'bazel-testlogs/**',
      'bazel-truth/**',
      'fixtures/**',
      'apps/generated/generated/**',
    ],
  },
  staged: {
    '*.{js,mjs,ts}': 'vp check --fix',
  },
})
