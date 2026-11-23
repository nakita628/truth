// Repo-specific convention plugin (an oxlint JS plugin using the alpha ESLint-compatible
// API). It reads the meaning of a declaration from the AST, which a glob cannot express.
// The rules are the ones from nakita628/hono-takibi and schema-truth that this package can
// hold; it has no Effect code, so the Effect rules are left out:
//
//   custom/type-pascal-case       a `type` alias is PascalCase
//   custom/predicate-is-name      a pure boolean predicate reads as a question: `is*`,
//                                 `has*` or `can*`
//   custom/identifier-case        a variable, a parameter and a function are camelCase,
//                                 PascalCase or UPPER_SNAKE_CASE: no snake_case and no stray
//                                 underscores
//   custom/no-undeclared-dependency a bare specifier in `src` names a `dependency` or a
//                                 `peerDependency` of package.json. oxlint has no
//                                 `import/no-extraneous-dependencies`; without this a
//                                 `devDependency` reaching shipped code passes every check
//                                 here and fails at the consumer's first import
//
// `func-style` already holds the function-declaration convention here. Tests are exempt:
// a test arranges and asserts imperatively when that is the clearest way to spell a fixture
// out.
import { builtinModules } from 'node:module'

import MANIFEST from '../package.json' with { type: 'json' }

const TEST_FILE = /\.test\.tsx?$/u
const SHIPPED_FILE = /(^|\/)src\//u
// camelCase, PascalCase or UPPER_SNAKE_CASE. A leading `_` marks a binding that is taken out
// of a rest pattern and not read, and a leading `$` is how JSON Schema spells `$ref`.
// camelCase, PascalCase or UPPER_SNAKE_CASE. A leading `_` marks a binding that is taken out
// of a rest pattern and not read, and a leading `$` is how JSON Schema spells `$ref`.
const IDENTIFIER_CASE =
  /^[_$]?(?:[a-z][A-Za-z0-9]*|[A-Z][A-Za-z0-9]*|[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)?$/u
const DECLARED = new Set([
  ...Object.keys(MANIFEST.dependencies),
  ...Object.keys(MANIFEST.peerDependencies ?? {}),
  ...Object.keys(MANIFEST.optionalDependencies ?? {}),
])
const BUILTINS = new Set(builtinModules)
const PREDICATE_PREFIX = /^(is|has|can)[A-Z]/u
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/u
const COMPARISON_OPERATORS = new Set([
  '===',
  '!==',
  '==',
  '!=',
  '<',
  '<=',
  '>',
  '>=',
  'instanceof',
  'in',
])

function filenameOf(context) {
  return context.filename ?? context.getFilename?.() ?? ''
}

function isTestPath(filename) {
  return TEST_FILE.test(filename)
}

/** The package a bare specifier names: `@scope/name/sub` is `@scope/name`, `name/sub` is `name`. */
function packageOf(specifier) {
  const segments = specifier.split('/')
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]
}

function isBareSpecifier(specifier) {
  return !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('node:')
}

/** Every identifier a binding pattern declares. */
function bindingsOf(pattern) {
  if (!pattern) return []
  if (pattern.type === 'Identifier') return [pattern]
  if (pattern.type === 'AssignmentPattern') return bindingsOf(pattern.left)
  if (pattern.type === 'RestElement') return bindingsOf(pattern.argument)
  if (pattern.type === 'TSParameterProperty') return bindingsOf(pattern.parameter)
  if (pattern.type === 'ArrayPattern') return pattern.elements.flatMap(bindingsOf)
  if (pattern.type === 'ObjectPattern') {
    return pattern.properties.flatMap((property) =>
      bindingsOf(property.type === 'RestElement' ? property : property.value),
    )
  }
  return []
}

function isBooleanExpression(node) {
  if (!node) return false
  if (node.type === 'Literal') return typeof node.value === 'boolean'
  if (node.type === 'UnaryExpression') return node.operator === '!'
  if (node.type === 'BinaryExpression') return COMPARISON_OPERATORS.has(node.operator)
  if (node.type === 'LogicalExpression') {
    return isBooleanExpression(node.left) && isBooleanExpression(node.right)
  }
  return false
}

// A function whose every `return` yields a boolean literal or a comparison — the shape a
// predicate has before anyone gives it a name.
function returnsBoolean(node) {
  if (node.type === 'ArrowFunctionExpression' && node.body.type !== 'BlockStatement') {
    return isBooleanExpression(node.body)
  }
  const body = node.body
  if (body?.type !== 'BlockStatement') return false
  const returns = body.body.filter((statement) => statement.type === 'ReturnStatement')
  return returns.length > 0 && returns.every((statement) => isBooleanExpression(statement.argument))
}

export default {
  meta: { name: 'custom' },
  rules: {
    'type-pascal-case': {
      meta: { docs: { description: 'a type alias is PascalCase' } },
      create(context) {
        return {
          TSTypeAliasDeclaration(node) {
            if (!node.id || PASCAL_CASE.test(node.id.name)) return
            context.report({
              node: node.id,
              message: `Name the type \`${node.id.name}\` in PascalCase, the way every other type here is written.`,
            })
          },
        }
      },
    },
    'predicate-is-name': {
      meta: { docs: { description: 'a pure boolean predicate reads as a question' } },
      create(context) {
        if (isTestPath(filenameOf(context))) return {}
        return {
          FunctionDeclaration(node) {
            if (!node.id || PREDICATE_PREFIX.test(node.id.name) || !returnsBoolean(node)) return
            context.report({
              node: node.id,
              message: `\`${node.id.name}\` answers a yes/no question, so name it \`is\`/\`has\`/\`can\` — e.g. \`is${node.id.name[0].toUpperCase()}${node.id.name.slice(1)}\` — and the call site reads as the question it asks.`,
            })
          },
        }
      },
    },
    'identifier-case': {
      meta: { docs: { description: 'bindings are camelCase, PascalCase or UPPER_SNAKE_CASE' } },
      create(context) {
        if (isTestPath(filenameOf(context))) return {}
        function check(identifiers) {
          for (const identifier of identifiers) {
            if (IDENTIFIER_CASE.test(identifier.name)) continue
            context.report({
              node: identifier,
              message: `Name \`${identifier.name}\` in camelCase (PascalCase for a schema or a class, UPPER_SNAKE_CASE for a module constant). An underscore inside a name is the casing of another language, and one at either end promises a privacy JavaScript does not keep.`,
            })
          }
        }
        function checkFunction(node) {
          check([...(node.id ? [node.id] : []), ...node.params.flatMap(bindingsOf)])
        }
        return {
          VariableDeclarator(node) {
            check(bindingsOf(node.id))
          },
          FunctionDeclaration: checkFunction,
          FunctionExpression: checkFunction,
          ArrowFunctionExpression: checkFunction,
          CatchClause(node) {
            check(bindingsOf(node.param))
          },
        }
      },
    },
    'no-undeclared-dependency': {
      meta: { docs: { description: 'shipped code imports only declared dependencies' } },
      create(context) {
        const filename = filenameOf(context)
        if (isTestPath(filename) || !SHIPPED_FILE.test(filename.replaceAll('\\', '/'))) return {}
        function check(source) {
          if (source?.type !== 'Literal' || typeof source.value !== 'string') return
          if (!isBareSpecifier(source.value)) return
          const name = packageOf(source.value)
          if (DECLARED.has(name)) return
          context.report({
            node: source,
            message: BUILTINS.has(name)
              ? `Import the Node built-in as \`node:${source.value}\`.`
              : `\`${name}\` is not a \`dependency\` or \`peerDependency\` of package.json, so it is not installed where this package is. Declare it, or keep the import out of \`src\`.`,
          })
        }
        return {
          ImportDeclaration(node) {
            check(node.source)
          },
          ExportNamedDeclaration(node) {
            check(node.source)
          },
          ExportAllDeclaration(node) {
            check(node.source)
          },
          ImportExpression(node) {
            check(node.source)
          },
        }
      },
    },
  },
}
