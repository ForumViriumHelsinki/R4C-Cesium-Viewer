// Ambient module declarations for non-code asset imports.
//
// Vite resolves CSS (and other asset) imports as side-effect modules at build
// time, but TypeScript has no built-in knowledge of these specifiers and reports
// TS2307 ("Cannot find module ... or its corresponding type declarations").
// Declaring them here lets `import('...css')` type-check while leaving the
// literal specifier intact for Vite's bundler to process.
//
// This is types-only; it emits no runtime code.

declare module '*.css' {
	const content: string
	export default content
}

// Vuetify's "./styles" export maps to a stylesheet with no type declarations;
// TypeScript 6 checks side-effect imports (TS2882), so declare it here.
declare module 'vuetify/styles'
