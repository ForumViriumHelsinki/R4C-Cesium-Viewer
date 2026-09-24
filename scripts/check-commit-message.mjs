/**
 * Parse a pull request's squash commit the way release-please will, and fail
 * when release-please would drop it.
 *
 * This repo squash-merges with the PR description as the commit body. When
 * release-please's conventional-commit parser throws on a commit, the commit is
 * logged at debug level and skipped: a feat/fix PR merges green and cuts no
 * release. The PR title check validates only the title.
 *
 * Mirrors release-please 17.3.0 (the version googleapis/release-please-action
 * v4.4.1 bundles, which the org reusable release-please workflow pins),
 * src/commit.ts:
 * - preprocessCommitMessage: a BEGIN_COMMIT_OVERRIDE ... END_COMMIT_OVERRIDE
 *   section of the PR body replaces the commit message.
 * - splitMessages: BEGIN_NESTED_COMMIT blocks and blank-line-separated
 *   conventional paragraphs become separate messages.
 * - parseCommits: parser.parser() from @conventional-commits/parser 0.4.1 on
 *   each message. That call is the only step that throws; the rest walks the
 *   AST it returns, and footer re-parses are wrapped in try/catch.
 *
 * The squash commit is not the PR body verbatim. GitHub hard-wraps the body at
 * 72 columns, outside fenced code blocks, dropping the indentation of the lines
 * it wraps. Every squash commit from #964 to #1038 matches that model byte for
 * byte, apart from the Co-authored-by trailers GitHub appends (footers, which
 * cannot make the parse throw). The wrap is what broke #1005, #1010, #1012 and
 * #1037: their bodies parse as written, and fail only once a wrapped line starts
 * with a call such as `name(`.
 *
 * CLI: reads PR_TITLE, PR_BODY and PR_NUMBER from the environment, as the
 * "Squash commit parses" job passes them. To check PR 12 locally:
 *   PR_NUMBER=12 PR_TITLE="$(gh pr view 12 --json title -q .title)" PR_BODY="$(gh pr view 12 --json body -q .body)" node scripts/check-commit-message.mjs
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parser } from '@conventional-commits/parser'

export const WRAP_WIDTH = 72

const FENCE = /^\s*(```|~~~)/
const NEWLINE = /\r\n|\r|\n/
const CONVENTIONAL_PARAGRAPH =
	/\r?\n\r?\n(?=(?:feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\(.*?\))?: )/

/**
 * Greedy word wrap of one line, as GitHub does it for squash commit bodies.
 * @param {string} line
 * @param {number} width
 * @returns {string[]}
 */
function wrapLine(line, width) {
	if (line.length <= width) return [line]
	const lines = []
	let current = ''
	for (const word of line.split(' ')) {
		if (current === '') current = word
		else if (current.length + 1 + word.length <= width) current += ` ${word}`
		else {
			lines.push(current)
			current = word
		}
	}
	lines.push(current)
	return lines
}

/**
 * The PR body as it appears in the squash commit: CRLF normalised, lines
 * longer than `width` wrapped, fenced code blocks left alone.
 * @param {string} body
 * @param {number} [width]
 * @returns {string}
 */
export function wrapBody(body, width = WRAP_WIDTH) {
	let inFence = false
	return body
		.replace(/\r\n/g, '\n')
		.split('\n')
		.flatMap((line) => {
			if (FENCE.test(line)) {
				inFence = !inFence
				return [line]
			}
			return inFence ? [line] : wrapLine(line, width)
		})
		.join('\n')
}

/**
 * The squash commit message GitHub builds: `<title> (#<number>)`, a blank line,
 * the wrapped body.
 * @param {{ title: string, number: string | number, body?: string | null }} pr
 * @returns {string}
 */
export function buildSquashMessage({ title, number, body }) {
	const subject = `${title} (#${number})`
	return body?.trim() ? `${subject}\n\n${wrapBody(body)}` : subject
}

/**
 * The BEGIN_COMMIT_OVERRIDE section release-please parses instead of the
 * commit message, or '' when there is none (preprocessCommitMessage).
 * @param {string | null | undefined} body
 * @returns {string}
 */
export function commitOverride(body) {
	return ((body ?? '').split('BEGIN_COMMIT_OVERRIDE')[1] || '')
		.split('END_COMMIT_OVERRIDE')[0]
		.trim()
}

/**
 * release-please's splitMessages: nested commits and conventional paragraphs
 * are parsed as separate commits.
 * @param {string} message
 * @returns {string[]}
 */
export function splitMessages(message) {
	const parts = message.split('BEGIN_NESTED_COMMIT')
	const messages = [parts.shift()]
	for (const part of parts) {
		const [newMessage, ...rest] = part.split('END_NESTED_COMMIT')
		messages.push(newMessage)
		messages[0] = messages[0] + rest.join('END_NESTED_COMMIT')
	}
	const conventionalCommits = messages[0].split(CONVENTIONAL_PARAGRAPH).filter(Boolean)
	return [...conventionalCommits, ...messages.slice(1)]
}

/**
 * Parse errors release-please would hit on a message, one per split message.
 * `line` is 1-based within `message`; `text` is that line.
 * @param {string} message
 * @returns {{ error: string, line: number | null, column: number | null, text: string | null }[]}
 */
export function parseErrors(message) {
	const messageLines = message.split(NEWLINE)
	const errors = []
	for (const part of splitMessages(message)) {
		try {
			parser(part)
		} catch (err) {
			const error = String(err?.message ?? err)
			const at = error.match(/ at (\d+):(\d+), valid tokens/)
			if (!at) {
				errors.push({ error, line: null, column: null, text: null })
				continue
			}
			// The parser scans part.trim(); map its line back into the message.
			const start = message.indexOf(part.trim())
			const offset = start < 0 ? 0 : message.slice(0, start).split(NEWLINE).length - 1
			const line = offset + Number(at[1])
			errors.push({ error, line, column: Number(at[2]), text: messageLines[line - 1] ?? null })
		}
	}
	return errors
}

/**
 * What release-please will parse for this PR once it is squash-merged, and the
 * errors it would hit.
 * @param {{ title: string, number: string | number, body?: string | null }} pr
 * @returns {{ source: string, message: string, errors: ReturnType<typeof parseErrors> }}
 */
export function checkPullRequest(pr) {
	const override = commitOverride(pr.body)
	const source = override ? 'the BEGIN_COMMIT_OVERRIDE section' : 'the squash commit message'
	const message = override || buildSquashMessage(pr)
	return { source, message, errors: parseErrors(message) }
}

/** Escape newlines so a parser error such as `unexpected token '\n'` stays on one line. */
const visible = (text) => text.replace(/\r/g, '\\r').replace(/\n/g, '\\n')

function main() {
	const { PR_TITLE, PR_BODY, PR_NUMBER } = process.env
	if (!PR_TITLE || !PR_NUMBER) {
		console.error('PR_TITLE and PR_NUMBER must be set (PR_BODY may be empty).')
		process.exit(2)
	}
	const { source, message, errors } = checkPullRequest({
		title: PR_TITLE,
		number: PR_NUMBER,
		body: PR_BODY,
	})
	const lineCount = message.split(NEWLINE).length
	if (errors.length === 0) {
		console.log(`release-please parses ${source} (${lineCount} lines).`)
		return
	}
	const messageLines = message.split(NEWLINE)
	for (const { error, line, text } of errors) {
		const where = line ? `line ${line}` : 'an unknown line'
		console.log(`::error::release-please cannot parse ${source} at ${where}: ${visible(error)}`)
		if (!line) continue
		console.log(`Line ${line}: ${text}`)
		console.log(`Context (${source}, lines ${Math.max(1, line - 2)}-${line + 2}):`)
		for (let n = Math.max(1, line - 2); n <= Math.min(messageLines.length, line + 2); n++) {
			console.log(`${n === line ? '>' : ' '} ${String(n).padStart(4)} | ${messageLines[n - 1]}`)
		}
	}
	console.log(
		[
			'',
			'release-please would skip this commit, so a feat/fix/perf change would cut no release.',
			'The usual cause is a line whose first word runs into "(" that does not close on the same',
			'line, or that opens a second "(" first, such as `name(` or `a.push(b(c))`. GitHub wraps',
			`the description at ${WRAP_WIDTH} columns when it builds the squash commit, so the line may`,
			'start mid-sentence in the description as written. Reword that sentence, or add a',
			'BEGIN_COMMIT_OVERRIDE ... END_COMMIT_OVERRIDE section with the commit message to use.',
			'Line 1 is the PR title.',
		].join('\n')
	)
	process.exit(1)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
