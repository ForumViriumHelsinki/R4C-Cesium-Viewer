/**
 * Static module graph of `src/`, rooted at `src/main.js`, for the contract tests
 * in this directory.
 *
 * Three kinds of edge make a module reachable:
 * - an import: static, re-export, dynamic `import()`, or a worker
 *   `new URL('…', import.meta.url)`;
 * - a component tag in a `.vue` template. `unplugin-vue-components`
 *   (`vite.config.js`, `Components({ dirs })`) registers every `.vue` file under
 *   `src/components` and `src/pages` by file name, so a tag reaches a component
 *   that nothing imports.
 *
 * Scripts are parsed with the TypeScript compiler and templates with
 * `vue/compiler-sfc`, so comments and strings never produce an edge. The same
 * pass records every `eventBus.emit/on/once/off` call.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse as parseSfc } from 'vue/compiler-sfc'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const SRC = join(ROOT, 'src')
const ENTRY = join(SRC, 'main.js')
const AUTO_COMPONENT_DIRS = [join(SRC, 'components'), join(SRC, 'pages')]
const SOURCE_EXTENSIONS = new Set(['.js', '.ts', '.vue'])
const RESOLVE_EXTENSIONS = ['', '.js', '.ts', '.vue', '.json', '.mjs']
const EVENT_BUS_METHODS = new Set(['emit', 'on', 'once', 'off'])

/** @param {string} dir @returns {string[]} absolute paths */
const listSourceFiles = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) return listSourceFiles(path)
		if (entry.name.endsWith('.d.ts')) return []
		return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : []
	})

const isFile = (path) => existsSync(path) && statSync(path).isFile()

/**
 * Resolves an import specifier the way Vite does for this repo: `@/` is `src/`,
 * relative paths resolve against the importer, bare specifiers are packages.
 * @returns {string|null} absolute path inside src/, or null
 */
const resolveSpecifier = (specifier, fromFile) => {
	const bare = specifier.split('?')[0]
	let base
	if (bare.startsWith('@/')) base = join(SRC, bare.slice(2))
	else if (bare.startsWith('.')) base = resolve(dirname(fromFile), bare)
	else return null
	const candidates = [
		...RESOLVE_EXTENSIONS.map((ext) => base + ext),
		join(base, 'index.js'),
		join(base, 'index.ts'),
	]
	const hit = candidates.find(isFile)
	return hit?.startsWith(SRC) ? hit : null
}

const kebabToPascal = (tag) =>
	tag
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('')

/** String literals anywhere inside an expression (covers `a ? 'x' : 'y'`). */
const stringLiteralsIn = (node) => {
	const found = []
	const visit = (n) => {
		if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) found.push(n.text)
		ts.forEachChild(n, visit)
	}
	visit(node)
	return found
}

const isImportMetaUrl = (node) =>
	ts.isPropertyAccessExpression(node) &&
	node.name.text === 'url' &&
	ts.isMetaProperty(node.expression)

/**
 * @param {string} code - script source
 * @param {string} file - absolute path, for resolution and reporting
 * @param {number} lineOffset - line of the script block within the file
 */
const scanScript = (code, file, lineOffset) => {
	const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	const specifiers = []
	const eventCalls = []
	const visit = (node) => {
		if (
			(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			specifiers.push(node.moduleSpecifier.text)
		} else if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			node.arguments[0] &&
			ts.isStringLiteral(node.arguments[0])
		) {
			specifiers.push(node.arguments[0].text)
		} else if (
			ts.isNewExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === 'URL' &&
			node.arguments?.length === 2 &&
			ts.isStringLiteral(node.arguments[0]) &&
			isImportMetaUrl(node.arguments[1])
		) {
			specifiers.push(node.arguments[0].text)
		} else if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			ts.isIdentifier(node.expression.expression) &&
			node.expression.expression.text === 'eventBus' &&
			EVENT_BUS_METHODS.has(node.expression.name.text)
		) {
			const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
			eventCalls.push({
				file: relative(ROOT, file),
				line: line + lineOffset + 1,
				method: node.expression.name.text,
				names: node.arguments[0] ? stringLiteralsIn(node.arguments[0]) : [],
			})
		}
		ts.forEachChild(node, visit)
	}
	visit(sourceFile)
	return { specifiers, eventCalls }
}

const templateTags = (ast) => {
	const tags = new Set()
	const walk = (node) => {
		if (node.type === 1) tags.add(node.tag)
		for (const child of node.children ?? []) walk(child)
	}
	if (ast) walk(ast)
	return tags
}

const scanFile = (file) => {
	const source = readFileSync(file, 'utf8')
	if (!file.endsWith('.vue')) return { ...scanScript(source, file, 0), tags: new Set() }
	const { descriptor } = parseSfc(source, { filename: file })
	const blocks = [descriptor.script, descriptor.scriptSetup].filter(Boolean)
	const scans = blocks.map((block) => scanScript(block.content, file, block.loc.start.line - 1))
	return {
		specifiers: scans.flatMap((s) => s.specifiers),
		eventCalls: scans.flatMap((s) => s.eventCalls),
		tags: templateTags(descriptor.template?.ast),
	}
}

let cached = null

/**
 * @returns {{
 *   files: string[],
 *   reachable: Set<string>,
 *   eventCalls: Array<{file: string, line: number, method: string, names: string[]}>
 * }} paths are relative to the repo root
 */
export const buildSourceGraph = () => {
	if (cached) return cached
	const files = listSourceFiles(SRC)
	const components = new Map(
		files
			.filter((f) => f.endsWith('.vue') && AUTO_COMPONENT_DIRS.some((d) => f.startsWith(d)))
			.map((f) => [basename(f, '.vue'), f])
	)
	const scans = new Map(files.map((f) => [f, scanFile(f)]))

	const reachable = new Set()
	const queue = [ENTRY]
	while (queue.length > 0) {
		const file = queue.pop()
		if (reachable.has(file)) continue
		reachable.add(file)
		const scan = scans.get(file)
		if (!scan) continue
		for (const specifier of scan.specifiers) {
			const target = resolveSpecifier(specifier, file)
			if (target) queue.push(target)
		}
		for (const tag of scan.tags) {
			const target = components.get(tag.includes('-') ? kebabToPascal(tag) : tag)
			if (target) queue.push(target)
		}
	}

	cached = {
		files: files.map((f) => relative(ROOT, f)).sort(),
		reachable: new Set([...reachable].map((f) => relative(ROOT, f))),
		eventCalls: [...scans.values()].flatMap((s) => s.eventCalls),
	}
	return cached
}
