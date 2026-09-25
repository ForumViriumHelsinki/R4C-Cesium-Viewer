# release-please and PR Descriptions: Why a Merged Commit Can Cut No Release

The working rules live in `.claude/rules/development.md` ("A PR Description Becomes the Commit Body"). This page keeps the mechanism and the evidence behind them.

This repo is set to `squash_merge_commit_message = PR_BODY`, so the squash
commit is the PR title plus ` (#<number>)`, a blank line, and the PR
description. GitHub hard-wraps each description line longer than 72 characters
when it builds that commit. It re-joins the line's words with single spaces,
which drops the indentation and collapses runs of spaces and tabs, and it
counts an emoji as one character. Code under a fence that starts in column 0 is
left alone; a fence indented under a list item is wrapped like prose. The 199
squash commits from #744 to #1043 all match the model in
`scripts/check-commit-message.mjs`, apart from the `Co-authored-by` trailers
GitHub appends.

release-please (17.3.0, through the org reusable workflow) parses each commit
with `@conventional-commits/parser` 0.4.1. The parser reads every body line as a
possible `token(scope): value` footer, so it throws on a line whose first word
runs straight into a `(` that does not close on that line, or that opens a
second `(` before closing: `` `name( ``, `<call>(`, `a.push(b(c))`. release-please
logs the throw at debug level and skips the commit, so a `feat:`/`fix:` PR
merges green and cuts **no release**; the version and CHANGELOG never move. The
org workflow's missed-release check reports it only as a run **warning**.

Because of the wrap, the offending line usually does not start that way in the
description as written: a call mid-sentence becomes the first word of a wrapped
line. Run 35996129826 (2026-09-24) dropped four commits whose descriptions
parse unwrapped:

| Commit    | PR    | Parser error                                       | Wrapped line starts with                            |
| --------- | ----- | -------------------------------------------------- | --------------------------------------------------- |
| `e7f70c9` | #1012 | `unexpected token '\n' at 83:70, valid tokens [)]` | `` `loadGeoJsonDataSource( ``                       |
| `4f671b5` | #1005 | `unexpected token '\n' at 56:33, valid tokens [)]` | `` `ndviTiffUrl( ``                                 |
| `689630d` | #1037 | `unexpected token '(' at 29:45, valid tokens [)]`  | `` `backgroundMapStore.floodLayers.push(markRaw( `` |
| `629a8d1` | #1010 | `unexpected token '\n' at 83:73, valid tokens [)]` | `<call>(`                                           |

Fenced code blocks are the other usual source: under a column-0 fence nothing is
wrapped, and code lines start with calls. Under an indented fence a long code
line is wrapped and loses its indentation, so it can start with a call too. On
2026-09-15 a `js` fence holding a `localStorage.setItem(...)` line (`e156d1f`,
#973, `'(' at 35:52`) killed the 1.57.0 release.

## Recovery evidence

On 2026-09-24 the `BEGIN_COMMIT_OVERRIDE` recovery restored #1005, #1010, #1012 and #1037: run 36005789211 logged no parse errors and considered 52 commits, against 48 in run 35996129826 earlier that day. A re-run without the section re-parses the same commit and fails the same way.
