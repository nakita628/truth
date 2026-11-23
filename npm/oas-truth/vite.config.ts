import { defineConfig } from 'vite-plus'

// oxlint-disable-next-line import/no-default-export -- Vite resolves the config through its default export
export default defineConfig({
  pack: {
    entry: {
      index: './src/index.ts',
    },
    format: 'esm',
    dts: true,
    // `exports` points at `.js` / `.d.ts`, not tsdown's `.mjs` / `.d.mts` default.
    fixedExtension: false,
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // The TypeSpec cases compile a real program; under a fully parallel run the 5s default is
    // contention, not a hung test.
    testTimeout: 30_000,
  },
  lint: {
    ignorePatterns: ['**/node_modules/**', '**/dist/**'],
    // Node-only package: declaring the runtime is what lets rules that resolve globals
    // (`no-undef`, `unicorn/prefer-global-this`) tell `process` apart from a typo.
    env: { node: true, es2024: true },
    // Setting `plugins` replaces oxlint's default list — restate the defaults, then add
    // import / promise / node / jsdoc.
    plugins: ['typescript', 'unicorn', 'oxc', 'import', 'promise', 'node', 'jsdoc', 'jest'],
    // The repository conventions a glob cannot express (naming, declared dependencies); see
    // lint/custom.js.
    jsPlugins: ['./lint/custom.js'],
    options: {
      typeAware: true,
      typeCheck: true,
      // A rule that stops firing must have its `oxlint-disable` comment deleted with it,
      // otherwise the suppression silently outlives its reason.
      reportUnusedDisableDirectives: 'deny',
      // Nothing here is configured as a warning; this keeps a rule that defaults to `warn` from
      // slipping through `vp check` unnoticed.
      denyWarnings: true,
    },
    categories: {
      correctness: 'error',
      suspicious: 'error',
      perf: 'error',
    },
    // Strict by design, following nakita628/hono-takibi and nakita628/hekireki: exceptions live
    // next to the code as `oxlint-disable-next-line` with a reason, never as `'off'` here. A rule
    // that does not fit this codebase at all is left out of the list, with a comment saying why.
    //
    // Rules in the correctness / suspicious / perf categories are already errors via `categories`
    // above and are not restated; this list only adds rules from the pedantic / style /
    // restriction / nursery categories, which no category enables.
    rules: {
      'custom/type-pascal-case': 'error',
      'custom/predicate-is-name': 'error',
      'custom/identifier-case': 'error',
      'custom/no-undeclared-dependency': 'error',
      // `@internal` and friends are modifiers, so their text belongs to the description;
      // `check-tag-names` is what catches a tag that is merely misspelled.
      'jsdoc/empty-tags': 'error',
      'jsdoc/check-tag-names': 'error',
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-param-reassign': ['error', { props: true }],
      'no-console': 'error',
      'no-plusplus': 'error',
      'no-underscore-dangle': 'error',
      // Paired with `env: { node: true }` above, so `process` resolves and a typo does not.
      'no-undef': 'error',
      'typescript/no-explicit-any': 'error',
      'typescript/no-non-null-assertion': 'error',
      'typescript/consistent-type-imports': 'error',
      'typescript/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      'typescript/no-misused-promises': 'error',
      'typescript/require-await': 'error',
      'typescript/prefer-readonly': 'error',
      'typescript/prefer-nullish-coalescing': 'error',
      'typescript/switch-exhaustiveness-check': 'error',
      'typescript/no-unsafe-argument': 'error',
      'typescript/no-unsafe-assignment': 'error',
      'typescript/no-unsafe-member-access': 'error',
      'typescript/no-unsafe-call': 'error',
      'typescript/no-unsafe-return': 'error',
      'unicorn/no-array-for-each': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-spread': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'import/no-cycle': 'error',
      'import/no-duplicates': 'error',
      'no-new-func': 'error',
      'no-return-assign': 'error',
      'no-else-return': 'error',
      'no-lonely-if': 'error',
      'prefer-object-spread': 'error',
      'symbol-description': 'error',
      'typescript/no-deprecated': 'error',
      'typescript/restrict-plus-operands': 'error',
      'typescript/no-confusing-void-expression': 'error',
      'typescript/only-throw-error': 'error',
      'typescript/prefer-promise-reject-errors': 'error',
      'typescript/prefer-reduce-type-parameter': 'error',
      'typescript/prefer-includes': 'error',
      'typescript/prefer-string-starts-ends-with': 'error',
      'typescript/prefer-optional-chain': 'error',
      'typescript/use-unknown-in-catch-callback-variable': 'error',
      'typescript/return-await': 'error',
      'unicorn/no-await-expression-member': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-at': 'error',
      'unicorn/explicit-length-check': 'error',
      'unicorn/throw-new-error': 'error',
      'import/no-default-export': 'error',
      'import/no-mutable-exports': 'error',
      'import/first': 'error',

      // Escape hatches out of the type system, and the unsound types that survive `strict`.
      'typescript/ban-ts-comment': 'error',
      'typescript/prefer-ts-expect-error': 'error',
      'typescript/no-unsafe-function-type': 'error',
      'typescript/no-empty-object-type': 'error',
      'typescript/no-invalid-void-type': 'error',
      'typescript/no-non-null-asserted-nullish-coalescing': 'error',
      'typescript/non-nullable-type-assertion-style': 'error',
      'typescript/no-dynamic-delete': 'error',
      'typescript/strict-void-return': 'error',

      // Declaration style. `consistent-type-definitions: 'type'` locks in the repo-wide
      // `type X = {...}`; the default of this rule is the opposite ('interface'), so the option is
      // load-bearing, not decoration.
      'typescript/consistent-type-definitions': ['error', 'type'],
      'typescript/consistent-type-exports': 'error',
      'typescript/consistent-generic-constructors': 'error',
      'typescript/array-type': 'error',
      'typescript/method-signature-style': 'error',
      'typescript/no-inferrable-types': 'error',
      'typescript/dot-notation': 'error',
      'typescript/prefer-for-of': 'error',
      'typescript/prefer-find': 'error',
      'typescript/prefer-function-type': 'error',
      // ESM-only package: a `require` call would not survive the build.
      'typescript/no-require-imports': 'error',
      'typescript/no-import-type-side-effects': 'error',

      // Rejections and throws must carry an Error, or the caller reports `[object Object]`
      // instead of an actionable message.
      'no-throw-literal': 'error',
      'unicorn/error-message': 'error',
      'unicorn/prefer-type-error': 'error',

      // Node / ESM hygiene.
      'unicorn/prefer-module': 'error',
      'unicorn/prefer-global-this': 'error',
      'unicorn/require-module-specifiers': 'error',
      // `unicorn/import-style` is deliberately absent: `path` is a domain noun here (OpenAPI Path
      // Item objects), so a `node:path` default import shadows a local wherever both are needed.
      'unicorn/prefer-export-from': 'error',
      'unicorn/prefer-import-meta-properties': 'error',
      // Pairs with `reportUnusedDisableDirectives` above: a suppression must name the rule it
      // silences and must still be earning its place.
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/no-anonymous-default-export': 'error',

      // String and array work: this is what a code generator does all day.
      'prefer-template': 'error',
      'no-useless-concat': 'error',
      'no-multi-str': 'error',
      'unicorn/consistent-template-literal-escape': 'error',
      'unicorn/consistent-existence-index-check': 'error',
      'unicorn/require-array-join-separator': 'error',
      'unicorn/prefer-negative-index': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-object-from-entries': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',
      'unicorn/prefer-code-point': 'error',
      'unicorn/prefer-native-coercion-functions': 'error',
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

      // Regex and numbers.
      'unicorn/prefer-regexp-test': 'error',
      'prefer-regex-literals': 'error',
      'require-unicode-regexp': 'error',
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
      // `no-implicit-coercion` is deliberately absent: its fix rewrites `!!(a && b)` to
      // `Boolean(a && b)`, and TypeScript's aliased-condition narrowing does not survive the call
      // form. The rule would trade a real type guarantee for a stylistic one.
      'unicorn/no-typeof-undefined': 'error',

      // Control flow and declarations. `curly` is `multi-line` rather than `all` so the
      // guard-clause form (`if (!x) return null` on one line) stays legal, while a body that
      // wraps onto its own line must be braced.
      curly: ['error', 'multi-line'],
      'no-useless-return': 'error',
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
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/prefer-structured-clone': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      // The rule's default name is `error`; restating it keeps a stray `e` from creeping back in.
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
      'new-cap': 'error',
      // A parked TODO is debt that belongs in an issue, not in the source.
      'no-warning-comments': 'error',
      // A `${...}` inside a single-quoted string is almost always a template literal that lost
      // its backticks — a real hazard when the product is emitted source.
      'no-template-curly-in-string': 'error',

      // promise / node rules sit outside the enabled categories, so the ones that matter for an
      // async Node library are named explicitly.
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
      'promise/prefer-await-to-then': 'error',
      'node/no-exports-assign': 'error',
      'node/no-new-require': 'error',
      'node/no-mixed-requires': 'error',
      'node/global-require': 'error',
      'node/no-path-concat': 'error',
      'node/handle-callback-err': 'error',
      'node/callback-return': 'error',

      // Module graph. `extensions` keeps relative specifiers `.js`-suffixed, which NodeNext
      // resolution requires at runtime and `tsc` does not check.
      'import/extensions': ['error', 'always', { ignorePackages: true }],
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

      // Naming: the identifiers a reader scans first.
      'no-shadow-restricted-names': 'error',
      'no-delete-var': 'error',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      // Adopted from nakita628/hono-takibi: the rest of its rule set that this package holds.
      'jest/valid-expect': ['error', { maxArgs: 2 }],
      'jest/no-identical-title': 'error',
      'jest/no-disabled-tests': 'error',
      'jest/no-focused-tests': 'error',
      'jest/no-duplicate-hooks': 'error',
      'jest/no-test-return-statement': 'error',
      'jest/no-standalone-expect': [
        'error',
        { additionalTestBlockFunctions: ['beforeAll', 'beforeEach', 'afterAll', 'afterEach'] },
      ],
      'jest/no-done-callback': 'error',
      'jest/no-export': 'error',
      'jest/no-alias-methods': 'error',
      'jest/prefer-to-be': 'error',
      'jest/prefer-strict-equal': 'error',
      'jest/prefer-to-have-length': 'error',
      'jest/prefer-equality-matcher': 'error',
      'jest/prefer-comparison-matcher': 'error',
      'jest/prefer-todo': 'error',
      // Equality is strict and written out; nothing is a snapshot.
      'jest/no-restricted-matchers': [
        'error',
        {
          toMatchSnapshot: 'Write the expected value out with toBe / toStrictEqual.',
          toMatchInlineSnapshot: 'Write the expected value out with toBe / toStrictEqual.',
          toThrowErrorMatchingSnapshot: 'Name the error the call throws.',
          toThrowErrorMatchingInlineSnapshot: 'Name the error the call throws.',
          toEqual: 'Use toStrictEqual: toEqual passes on undefined properties and other classes.',
        },
      ],
      // A namespace import hides which bindings a module uses. Effect is the exception: its
      // modules are imported whole by design.
      'import/no-namespace': ['error', { ignore: ['effect/*', '@effect/platform-node/*'] }],
      'import/named': 'error',
      'import/newline-after-import': 'error',
      'import/no-amd': 'error',
      'import/no-dynamic-require': 'error',
      'import/no-webpack-loader-syntax': 'error',
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      // A module that imports this much is doing more than one job.
      'import/max-dependencies': ['error', { max: 13 }],
      'node/no-process-env': 'error',
      'unicorn/no-process-exit': 'error',
      'node/no-sync': 'error',
      'promise/avoid-new': 'error',
      'no-promise-executor-return': 'error',
      // Names say what they hold: one letter only for the conventional ones (`k` / `v`,
      // `a` / `b`, a type parameter).
      'id-length': [
        'error',
        {
          min: 2,
          properties: 'never',
          exceptions: [
            '_',
            'k',
            'v',
            's',
            'p',
            'n',
            'm',
            'i',
            'a',
            'b',
            'z',
            'T',
            'K',
            'A',
            'E',
            'M',
          ],
        },
      ],
      // Abbreviations that name a shape instead of a meaning.
      'id-denylist': [
        'error',
        'data',
        'tmp',
        'temp',
        'foo',
        'bar',
        'cb',
        'err',
        'e',
        'res',
        'req',
        'obj',
        'val',
        'arr',
        'str',
        'fn',
        'ret',
        'idx',
        'cnt',
        'num',
        'buf',
        'ctx',
        'elem',
        'el',
        'cur',
        'x',
        'y',
      ],
      'func-name-matching': 'error',
      // Nesting past these depths is a function waiting to be named or an early return
      // waiting to be written.
      'max-depth': ['error', 4],
      'max-nested-callbacks': ['error', 4],
      'max-classes-per-file': ['error', 2],
      // A condition is a boolean or a nullable one: `if (count)` and `if (object)` say less
      // than they look.
      'typescript/strict-boolean-expressions': [
        'error',
        { allowNullableBoolean: true, allowNullableString: true, allowNumber: false },
      ],
      'typescript/no-unnecessary-condition': 'error',
      'typescript/consistent-indexed-object-style': ['error', 'index-signature'],
      'typescript/adjacent-overload-signatures': 'error',
      'typescript/unified-signatures': 'error',
      'typescript/ban-tslint-comment': 'error',
      'typescript/no-unnecessary-qualifier': 'error',
      'typescript/no-namespace': 'error',
      'typescript/no-mixed-enums': 'error',
      'typescript/prefer-enum-initializers': 'error',
      'typescript/prefer-literal-enum-member': 'error',
      'oxc/no-const-enum': 'error',
      'typescript/parameter-properties': 'error',
      'typescript/no-empty-interface': 'error',
      'typescript/class-literal-property-style': 'error',
      'typescript/prefer-return-this-type': 'error',
      'typescript/related-getter-setter-pairs': 'error',
      'accessor-pairs': 'error',
      'grouped-accessor-pairs': 'error',
      'class-methods-use-this': 'error',
      'no-constructor-return': 'error',
      'unicorn/no-static-only-class': 'error',
      'unicorn/no-this-assignment': 'error',
      'unicorn/prefer-class-fields': 'error',
      'unicorn/custom-error-definition': 'error',
      'typescript/prefer-regexp-exec': 'error',
      'unicorn/no-console-spaces': 'error',
      'unicorn/require-number-to-fixed-digits-argument': 'error',
      'default-case': 'error',
      'unicorn/switch-case-braces': ['error', 'avoid'],
      'unicorn/switch-case-break-position': 'error',
      'unicorn/prefer-ternary': 'error',
      'unicorn/no-negation-in-equality-check': 'error',
      'logical-assignment-operators': 'error',
      'no-eq-null': 'error',
      'sort-vars': 'error',
      'vars-on-top': 'error',
      'oxc/branches-sharing-code': 'error',
      'oxc/bad-bitwise-operator': 'error',
      'no-proto': 'error',
      'no-alert': 'error',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-new-buffer': 'error',
      'unicorn/no-unnecessary-array-splice-count': 'error',
      'unicorn/no-useless-iterator-to-array': 'error',
      'unicorn/prefer-prototype-methods': 'error',
      'unicorn/prefer-reflect-apply': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/consistent-date-clone': 'error',
      'unicorn/prefer-event-target': 'error',
      'unicorn/prefer-bigint-literals': 'error',
      'unicorn/text-encoding-identifier-case': 'error',
      'unicorn/explicit-timer-delay': 'error',
      'unicorn/consistent-assert': 'error',
      'unicorn/prefer-top-level-await': 'error',
      'unicorn/require-module-attributes': 'error',
      'jsdoc/check-access': 'error',
      'jsdoc/no-blank-blocks': 'error',
      'jsdoc/require-param-name': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns-description': 'error',
      'jsdoc/check-property-names': 'error',
      'jsdoc/implements-on-classes': 'error',
      'jsdoc/no-defaults': 'error',
      'jsdoc/require-property': 'error',
      'jsdoc/require-property-description': 'error',
      'jsdoc/require-property-name': 'error',
      'jsdoc/require-throws-description': 'error',
      'jsdoc/require-yields-description': 'error',
    },
    // Architecture of src: each directory may import only the layers below it.
    //
    //   utils, openapi   leaf modules
    //   adapter          openapi
    //   helper           adapter, openapi, utils
    //   generator        adapter, helper, openapi, utils
    //
    // Regexes match relative specifiers only, so external packages never collide with a banned
    // directory name.
    overrides: [
      {
        // The plugin itself: oxlint's plugin API is untyped, so it walks ESTree nodes typed
        // `any`, and the plugin object is the module's default export.
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
          'typescript/strict-boolean-expressions': 'off',
          'typescript/no-unnecessary-condition': 'off',
        },
      },
      {
        files: ['src/utils/**', 'src/openapi/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  regex: '^\\.\\./',
                  message: 'leaf module: no project-internal imports allowed',
                },
              ],
            },
          ],
        },
      },
      {
        files: ['src/adapter/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  regex: '^(\\.\\./)+(generator|helper|utils)(/.*)?$',
                  message: 'adapter may only import openapi',
                },
              ],
            },
          ],
        },
      },
      {
        files: ['src/helper/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  regex: '^(\\.\\./)+generator(/.*)?$',
                  message: 'helper may only import adapter, openapi, utils',
                },
              ],
            },
          ],
        },
      },
      {
        // The one place a document is narrowed to the `OpenAPI` type: swagger-parser validates the
        // spec at runtime but does not express that guarantee in its return type.
        files: ['src/openapi/index.ts'],
        rules: {
          'typescript/consistent-type-assertions': 'off',
          'typescript/no-unsafe-type-assertion': 'off',
        },
      },
      {
        // Test files may cast and use `any`; the type-safety rules that exist only to police
        // those casts are scoped off here, nothing else is.
        files: ['**/*.test.ts'],
        plugins: ['vitest'],
        rules: {
          // Adopted from nakita628/hono-takibi.
          'typescript/strict-boolean-expressions': 'off',
          'typescript/no-unnecessary-condition': 'off',
          'node/no-sync': 'off',
          'promise/avoid-new': 'off',
          'no-promise-executor-return': 'off',
          'max-nested-callbacks': 'off',
          'id-length': 'off',
          'id-denylist': 'off',
          'vitest/consistent-each-for': 'error',
          'vitest/consistent-vitest-vi': 'error',
          'vitest/consistent-test-filename': 'error',
          'vitest/max-nested-describe': 'error',
          'vitest/no-import-node-test': 'error',
          'vitest/no-unneeded-async-expect-function': 'error',
          'vitest/prefer-called-exactly-once-with': 'error',
          'vitest/prefer-called-once': 'error',
          'vitest/prefer-mock-promise-shorthand': 'error',
          'vitest/prefer-mock-return-shorthand': 'error',
          'vitest/prefer-strict-boolean-matchers': 'error',
          'vitest/prefer-strict-equal': 'error',
          'vitest/prefer-to-be': 'error',
          'vitest/prefer-to-be-object': 'error',
          'vitest/prefer-to-contain': 'error',
          'vitest/prefer-to-have-length': 'error',
          'vitest/prefer-comparison-matcher': 'error',
          'vitest/prefer-expect-resolves': 'error',
          'vitest/prefer-todo': 'error',
          'vitest/prefer-importing-vitest-globals': 'error',
          // `let` declared per suite and assigned in a hook is the shape of a fixture, not an
          // uninitialized binding waiting to bite.
          'init-declarations': 'off',
          // Stub callbacks passed to a spy are the point.
          'no-empty-function': 'off',
          'no-restricted-imports': 'off',
          'typescript/no-explicit-any': 'off',
          'typescript/consistent-type-assertions': 'off',
          'typescript/no-unsafe-type-assertion': 'off',
          'typescript/no-unsafe-argument': 'off',
          'typescript/no-unsafe-assignment': 'off',
          'typescript/no-unsafe-member-access': 'off',
          'typescript/no-unsafe-call': 'off',
          'typescript/no-unsafe-return': 'off',
          // Fixtures feed and assert on source text that contains a literal `${...}`; there that
          // is the value under test, not a lost backtick.
          'no-template-curly-in-string': 'off',
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
          'vitest/no-interpolation-in-snapshots': 'error',
          'vitest/no-large-snapshots': 'error',
        },
      },
    ],
  },
  // Style (printWidth / quotes / semicolons / import sorting) is inherited from the root
  // vite.config.ts; only the paths this workspace skips are declared here.
  fmt: {
    ignorePatterns: ['**/node_modules/**', '**/dist/**'],
  },
})
