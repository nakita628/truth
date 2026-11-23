export type ComponentDeclaration = {
  readonly name: string
  readonly varName: string
  readonly fileName: string
  readonly code: string
}

export type ComponentCodeOptions = {
  readonly exportTypes?: boolean
  readonly readonly?: boolean
  readonly identifiers?: ReadonlyMap<string, string>
}

/**
 * Join declaration bodies the way `make<Kind>Code` already does: `;` between
 * entries, no `import ` line. `trailingNewline` matches examples / links /
 * security-schemes / parameters / headers. `importLine` is the line itself, or
 * built from the joined code, so it imports what the declarations name.
 */
export function joinDeclarations(
  declarations: readonly ComponentDeclaration[],
  options?: {
    readonly trailingNewline?: boolean
    readonly importLine?: string | ((code: string) => string)
  },
) {
  if (declarations.length === 0) return ''
  const body = declarations.map((declaration) => declaration.code).join(';')
  const text = options?.trailingNewline === true ? `${body}\n` : body
  const importLine =
    typeof options?.importLine === 'function' ? options.importLine(body) : options?.importLine
  return importLine === undefined ? text : `${importLine}\n\n${text}`
}
