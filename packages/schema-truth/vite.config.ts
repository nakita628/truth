import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: {
      index: './src/index.ts',
      'cli/zod': './src/zod.ts',
      'cli/valibot': './src/valibot.ts',
      'cli/effect': './src/effect.ts',
      'cli/typebox': './src/typebox.ts',
      'cli/arktype': './src/arktype.ts',
      'cli/ajv': './src/ajv.ts',
      'cli/yup': './src/yup.ts',
      zod: './src/generator/zod/index.ts',
      valibot: './src/generator/valibot/index.ts',
      effect: './src/generator/effect/index.ts',
      typebox: './src/generator/typebox/index.ts',
      arktype: './src/generator/arktype/index.ts',
      ajv: './src/generator/ajv/index.ts',
      yup: './src/generator/yup/index.ts',
    },
    format: 'esm',
    dts: true,
    outDir: 'dist',
    clean: true,
    // `bin` and `exports` point at `.js` / `.d.ts`, not tsdown's `.mjs` default.
    fixedExtension: false,
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 10_000,
  },
  lint: {
    ignorePatterns: ['**/node_modules/**', '**/dist/**'],
    // Node-only package: declaring the runtime is what lets rules that resolve globals
    // (`no-undef`, `unicorn/prefer-global-this`) tell `process` apart from a typo.
    env: { node: true, es2024: true },
    // Setting `plugins` replaces oxlint's default list — restate the defaults, then add
    // import / promise / node / jsdoc.
    plugins: ['typescript', 'unicorn', 'oxc', 'import', 'promise', 'node', 'jsdoc'],
    // The repository conventions a glob cannot express (declaration shape, predicate
    // naming, where an Effect may be run); see lint/custom.js.
    jsPlugins: ['./lint/custom.js'],
    options: {
      typeAware: true,
      typeCheck: true,
      // A rule that stops firing must have its `oxlint-disable` comment deleted with it,
      // otherwise the suppression silently outlives its reason.
      reportUnusedDisableDirectives: 'deny',
      // Nothing here is configured as a warning; this keeps a rule that defaults to
      // `warn` from slipping through `vp check` unnoticed.
      denyWarnings: true,
    },
    categories: {
      correctness: 'error',
      suspicious: 'error',
      perf: 'error',
    },
    // Strict by design: exceptions live next to the code as `oxlint-disable-next-line`
    // with a reason, never as `'off'` here. A rule that does not fit this codebase at all
    // is left out of the list entirely, with a comment where it would have gone saying
    // why.
    //
    // Rules in the correctness / suspicious / perf categories are already errors via
    // `categories` above and are not restated; this list only adds rules from the
    // pedantic / style / restriction / nursery categories, which no category enables.
    rules: {
      'custom/function-declaration': 'error',
      'custom/type-pascal-case': 'error',
      'custom/predicate-is-name': 'error',
      'custom/no-effect-run': 'error',
      'custom/effect-promise-import': 'error',
      'custom/no-effect-fn': 'error',
      'custom/no-effect-flatmap': 'error',
      // `_enum` is the one sanctioned dangling underscore: `enum` is a reserved word, so
      // the generator that emits an enum cannot be named after what it does without it.
      'no-underscore-dangle': ['error', { allow: ['_enum'] }],

      // Escape hatches out of the type system, and the unsound types that survive `strict`.
      'typescript/no-explicit-any': 'error',
      'typescript/no-non-null-assertion': 'error',
      'typescript/no-non-null-asserted-nullish-coalescing': 'error',
      'typescript/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      'typescript/non-nullable-type-assertion-style': 'error',
      'typescript/ban-ts-comment': 'error',
      'typescript/prefer-ts-expect-error': 'error',
      'typescript/no-unsafe-function-type': 'error',
      'typescript/no-empty-object-type': 'error',
      'typescript/no-invalid-void-type': 'error',
      'typescript/no-dynamic-delete': 'error',
      'typescript/no-unsafe-argument': 'error',
      'typescript/no-unsafe-assignment': 'error',
      'typescript/no-unsafe-member-access': 'error',
      'typescript/no-unsafe-call': 'error',
      'typescript/no-unsafe-return': 'error',
      'typescript/no-deprecated': 'error',
      'typescript/no-misused-promises': 'error',
      'typescript/require-await': 'error',
      'typescript/strict-void-return': 'error',

      // Declaration style. `consistent-type-definitions: 'type'` locks in the repo-wide
      // `type X = {...}`; the default of this rule is the opposite ('interface'), so the
      // option is load-bearing, not decoration.
      'typescript/consistent-type-definitions': ['error', 'type'],
      'typescript/consistent-type-imports': 'error',
      'typescript/consistent-type-exports': 'error',
      'typescript/consistent-generic-constructors': 'error',
      'typescript/array-type': 'error',
      'typescript/method-signature-style': 'error',
      'typescript/no-inferrable-types': 'error',
      'typescript/prefer-readonly': 'error',
      'typescript/prefer-for-of': 'error',
      'typescript/prefer-find': 'error',
      'typescript/prefer-function-type': 'error',
      'typescript/prefer-includes': 'error',
      'typescript/prefer-nullish-coalescing': 'error',
      'typescript/prefer-optional-chain': 'error',
      'typescript/prefer-reduce-type-parameter': 'error',
      'typescript/prefer-string-starts-ends-with': 'error',
      'typescript/switch-exhaustiveness-check': 'error',
      'typescript/dot-notation': 'error',
      'typescript/restrict-plus-operands': 'error',
      'typescript/no-confusing-void-expression': 'error',
      'typescript/return-await': 'error',
      'typescript/use-unknown-in-catch-callback-variable': 'error',
      // ESM-only package: a `require` call would not survive the build.
      'typescript/no-require-imports': 'error',
      'typescript/no-import-type-side-effects': 'error',

      // Rejections and throws must carry an Error, or the CLI reports `[object Object]`
      // instead of an actionable message.
      'no-throw-literal': 'error',
      'typescript/only-throw-error': 'error',
      'typescript/prefer-promise-reject-errors': 'error',
      'unicorn/error-message': 'error',
      'unicorn/prefer-type-error': 'error',
      'unicorn/throw-new-error': 'error',

      // Node / ESM hygiene.
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-module': 'error',
      'unicorn/prefer-global-this': 'error',
      'unicorn/require-module-specifiers': 'error',
      'unicorn/prefer-export-from': 'error',
      'unicorn/prefer-import-meta-properties': 'error',
      // `no-abusive-eslint-disable` pairs with `reportUnusedDisableDirectives` above: a
      // suppression must name the rule it silences and must still be earning its place.
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/no-anonymous-default-export': 'error',
      // `unicorn/import-style` is deliberately absent: it wants `node:path` as a default
      // import, and this package uses the namespace form throughout.

      // String and array work: this is what a code generator does all day.
      'prefer-template': 'error',
      'no-useless-concat': 'error',
      'no-multi-str': 'error',
      'unicorn/consistent-template-literal-escape': 'error',
      'unicorn/consistent-existence-index-check': 'error',
      'unicorn/require-array-join-separator': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',
      'unicorn/prefer-at': 'error',
      'unicorn/prefer-negative-index': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-object-from-entries': 'error',
      'unicorn/prefer-spread': 'error',
      'unicorn/prefer-native-coercion-functions': 'error',
      'unicorn/no-array-for-each': 'error',
      'unicorn/no-await-expression-member': 'error',
      'unicorn/explicit-length-check': 'error',
      'unicorn/consistent-empty-array-spread': 'error',
      'unicorn/prefer-single-call': 'error',
      'unicorn/no-useless-collection-argument': 'error',
      'unicorn/no-useless-fallback-in-spread': 'error',
      'unicorn/no-unnecessary-array-flat-depth': 'error',
      'unicorn/no-magic-array-flat-depth': 'error',
      'unicorn/no-unnecessary-slice-end': 'error',
      'unicorn/no-length-as-slice-end': 'error',
      'unicorn/no-unreadable-array-destructuring': 'error',
      'unicorn/no-immediate-mutation': 'error',

      // Regex and numbers. `require-unicode-regexp` is deliberately absent: the patterns
      // here are compiled from user-supplied JSON Schema `pattern` values and echoed back
      // into generated source, where adding a `u` flag would change what they match.
      'unicorn/prefer-regexp-test': 'error',
      'prefer-regex-literals': 'error',
      'no-div-regex': 'error',
      'no-regex-spaces': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-math-min-max': 'error',
      'unicorn/prefer-math-trunc': 'error',
      'unicorn/prefer-modern-math-apis': 'error',
      'unicorn/numeric-separators-style': 'error',
      'unicorn/no-zero-fractions': 'error',
      'unicorn/escape-case': 'error',
      'unicorn/no-hex-escape': 'error',
      radix: 'error',
      'prefer-numeric-literals': 'error',
      'prefer-exponentiation-operator': 'error',
      'unicorn/no-typeof-undefined': 'error',

      // Control flow and declarations. `curly` is `multi-line` rather than `all` so the
      // guard-clause form (`if (!x) return null` on one line) stays legal, while a body
      // that wraps onto its own line must be braced.
      curly: ['error', 'multi-line'],
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-param-reassign': ['error', { props: true }],
      'no-console': 'error',
      // The counter in a `for(...)` head is the one place `++` reads as the idiom.
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'no-useless-return': 'error',
      'no-else-return': 'error',
      'no-lonely-if': 'error',
      'unicorn/no-lonely-if': 'error',
      'unicorn/prefer-logical-operator-over-ternary': 'error',
      'unicorn/prefer-default-parameters': 'error',
      'unicorn/no-object-as-default-parameter': 'error',
      'unicorn/no-unreadable-iife': 'error',
      'unicorn/no-useless-switch-case': 'error',
      'default-case-last': 'error',
      'default-param-last': 'error',
      'no-fallthrough': 'error',
      'no-case-declarations': 'error',
      'array-callback-return': 'error',
      'no-loop-func': 'error',
      'no-inner-declarations': 'error',
      'block-scoped-var': 'error',
      'init-declarations': 'error',
      'no-redeclare': 'error',
      'no-multi-assign': 'error',
      'no-sequences': 'error',
      'no-useless-assignment': 'error',
      'no-unreachable-loop': 'error',
      'no-return-assign': 'error',
      'no-new-func': 'error',
      // Hoisted `function` declarations are safe to reference above their definition;
      // `const` / `class` are the TDZ hazard this rule is for.
      'no-use-before-define': ['error', { functions: false }],
      'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
      'arrow-body-style': 'error',
      'prefer-arrow-callback': 'error',
      'guard-for-in': 'error',
      'no-labels': 'error',
      'no-label-var': 'error',
      'no-extra-label': 'error',
      'no-lone-blocks': 'error',
      yoda: 'error',
      'no-self-compare': 'error',

      // Objects and globals.
      'object-shorthand': 'error',
      'operator-assignment': 'error',
      'prefer-object-spread': 'error',
      'prefer-object-has-own': 'error',
      'no-prototype-builtins': 'error',
      'no-object-constructor': 'error',
      'no-array-constructor': 'error',
      'no-new-wrappers': 'error',
      'unicorn/new-for-builtins': 'error',
      'prefer-rest-params': 'error',
      'no-implicit-globals': 'error',
      'no-extra-bind': 'error',
      'no-useless-computed-key': 'error',
      'symbol-description': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/prefer-structured-clone': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      // The rule's default name is `error`; restating it keeps a stray `e` from creeping
      // back in.
      'unicorn/catch-error-name': ['error', { name: 'error' }],

      // Code injection surfaces (`eval` itself is already `correctness`).
      'no-script-url': 'error',
      'no-bitwise': 'error',
      // `void promise` is the marker `typescript/no-floating-promises` prescribes for a
      // deliberate fire-and-forget; `void 0` stays banned.
      'no-void': ['error', { allowAsStatement: true }],
      'no-empty': 'error',
      'no-empty-function': 'error',
      'unicode-bom': 'error',
      // `capIsNew: false`: Effect Schema's constructors are capitalized functions
      // (`Schema.TemplateLiteral`, `Schema.Literals`) called without `new`. The other half
      // of the rule — `new` on a lowercase function — stays on.
      'new-cap': ['error', { capIsNew: false }],
      // A parked TODO is debt that belongs in an issue, not in the source.
      'no-warning-comments': 'error',
      // `no-template-curly-in-string` is deliberately absent: this package emits
      // TypeScript source, and a single-quoted string holding `${...}` is routinely the
      // generated template literal under test rather than a lost backtick.

      // Documentation. `@internal` and friends are modifiers, so their text belongs to
      // the description; `check-tag-names` is what catches a tag that is merely
      // misspelled.
      'jsdoc/empty-tags': 'error',
      'jsdoc/check-tag-names': 'error',

      // promise / node rules sit outside the enabled categories, so the ones that matter
      // for an async Node CLI are named explicitly.
      'promise/param-names': 'error',
      'promise/valid-params': 'error',
      'promise/spec-only': 'error',
      'promise/no-new-statics': 'error',
      'promise/no-multiple-resolved': 'error',
      'promise/no-return-wrap': 'error',
      'promise/no-return-in-finally': 'error',
      'promise/no-nesting': 'error',
      'promise/no-promise-in-callback': 'error',
      'promise/no-callback-in-promise': 'error',
      'promise/catch-or-return': 'error',
      'promise/always-return': 'error',
      'promise/prefer-catch': 'error',
      // `promise/prefer-await-to-then` is deliberately absent: it matches any `.catch()`,
      // and zod's `.catch(fallback)` — all over the generator output and its tests — is a
      // schema method, not a promise.
      'node/no-exports-assign': 'error',
      'node/no-new-require': 'error',
      'node/no-mixed-requires': 'error',
      'node/global-require': 'error',
      'node/no-path-concat': 'error',
      'node/handle-callback-err': 'error',
      'node/callback-return': 'error',

      // Module graph. `extensions` keeps relative specifiers `.js`-suffixed, which
      // NodeNext resolution requires at runtime and `tsc` does not check.
      'import/extensions': ['error', 'always', { ignorePackages: true }],
      'import/no-cycle': 'error',
      'import/no-duplicates': 'error',
      'import/no-default-export': 'error',
      'import/no-mutable-exports': 'error',
      'import/first': 'error',
      'import/export': 'error',
      'import/unambiguous': 'error',
      'import/no-commonjs': 'error',
      'import/no-named-default': 'error',
      'import/no-unassigned-import': 'error',
      'import/no-named-as-default': 'error',
      'import/no-anonymous-default-export': 'error',
      'import/consistent-type-specifier-style': 'error',
      'import/no-self-import': 'error',
      'import/no-absolute-path': 'error',
      'import/no-empty-named-blocks': 'error',

      // Naming.
      'no-shadow': 'error',
      'no-shadow-restricted-names': 'error',
      'no-delete-var': 'error',
      // `unicorn/filename-case` is deliberately absent: `sea-orm.ts`-style names would be
      // fine, but the generator directories are named after the libraries they target
      // (`typebox`, `arktype`), which is the correspondence worth keeping.
    },
    overrides: [
      {
        // A Vite config's contract with Vite is a default export.
        files: ['vite.config.ts'],
        rules: { 'import/no-default-export': 'off' },
      },
      {
        // The bin entries are the one place a program is run rather than returned, and
        // `NodeRuntime.runMain` is the top-level statement that does it.
        files: ['src/{zod,valibot,effect,typebox,arktype,ajv,yup}.ts'],
        rules: { 'import/no-unassigned-import': 'off' },
      },
      {
        // The convention plugin is an oxlint JS plugin: it walks an untyped ESTree and
        // its contract with oxlint is a default export.
        files: ['lint/**'],
        rules: {
          'import/no-default-export': 'off',
          'import/no-anonymous-default-export': 'off',
          'unicorn/no-anonymous-default-export': 'off',
          'typescript/no-unsafe-argument': 'off',
          'typescript/no-unsafe-assignment': 'off',
          'typescript/no-unsafe-call': 'off',
          'typescript/no-unsafe-member-access': 'off',
          'typescript/no-unsafe-return': 'off',
        },
      },
      {
        // The one intentional cycle: a JSON Schema object holds schemas, and a schema
        // may be an object, so each generator's `object.ts` and its entry module call
        // each other. Untangling it would mean passing the entry point in as a
        // parameter through every emitter — the rule stays on everywhere else, which is
        // where an accidental cycle would appear.
        files: [
          'src/generator/*/object.ts',
          'src/generator/{zod,valibot,effect,typebox,arktype,ajv,yup}/{zod,valibot,effect,typebox,arktype,ajv,yup}.ts',
        ],
        rules: { 'import/no-cycle': 'off' },
      },
      {
        // Test files may cast and reach for `any` when spelling out a fixture; the
        // type-safety rules that exist only to police those casts are scoped off here,
        // nothing else is.
        files: ['**/*.test.ts'],
        plugins: ['vitest'],
        rules: {
          'typescript/no-explicit-any': 'off',
          'typescript/consistent-type-assertions': 'off',
          'typescript/no-unsafe-type-assertion': 'off',
          'typescript/no-unsafe-argument': 'off',
          'typescript/no-unsafe-assignment': 'off',
          'typescript/no-unsafe-member-access': 'off',
          'typescript/no-unsafe-call': 'off',
          'typescript/no-unsafe-return': 'off',
          // `let` declared per suite and assigned in a hook is the shape of a fixture,
          // not an uninitialized binding waiting to bite.
          'init-declarations': 'off',
          // A fixture builder defined beside the cases it feeds reads better there than
          // at module scope, even when it captures nothing.
          'unicorn/consistent-function-scoping': 'off',
          // Test files sit outside tsconfig.json, so type-aware lint sees the default lib,
          // which predates `toSorted`; `.sort()` on fresh arrays stays allowed here.
          'unicorn/no-array-sort': 'off',
          // Stub callbacks (`() => {}` passed as a generator) are the point.
          'no-empty-function': 'off',
          // A few suites still branch before `expect` when a fixture is missing a file.
          'vitest/no-conditional-expect': 'off',
          'vitest/no-identical-title': 'error',
          'vitest/valid-expect': 'error',
          'vitest/valid-title': 'error',
          'vitest/valid-describe-callback': 'error',
          // An `expect` outside a test case is never run and never reported.
          'vitest/no-standalone-expect': 'error',
          'vitest/no-test-return-statement': 'error',
          'vitest/no-test-prefixes': 'error',
          'vitest/no-duplicate-hooks': 'error',
          'vitest/prefer-hooks-on-top': 'error',
          'vitest/prefer-hooks-in-order': 'error',
          'vitest/consistent-test-it': 'error',
          'vitest/no-alias-methods': 'error',
          'vitest/prefer-equality-matcher': 'error',
          'vitest/require-to-throw-message': 'error',
          'vitest/prefer-each': 'error',
          'vitest/prefer-spy-on': 'error',
          'vitest/no-mocks-import': 'error',
          // Snapshots are a partial-match assertion by another name, so they are kept
          // small and literal where they appear at all.
          'vitest/no-interpolation-in-snapshots': 'error',
          'vitest/no-large-snapshots': 'error',
        },
      },
    ],
  }, // Style (printWidth / quotes / semicolons / import sorting) is inherited from the root
  // vite.config.ts: only the root `fmt` block reaches oxfmt in a workspace. Only the paths
  // this workspace skips are declared here.
  fmt: {
    ignorePatterns: ['**/node_modules/**', '**/dist/**'],
  },
})
