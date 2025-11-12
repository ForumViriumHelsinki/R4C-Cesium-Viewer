import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";

export default [
  {
    name: "app/files-to-lint",
    files: ["**/*.{js,mjs,jsx,ts,tsx,vue}"],
  },

  {
    name: "app/files-to-ignore",
    ignores: ["**/dist/**", "**/dist-ssr/**", "**/coverage/**"],
  },

  js.configs.recommended,
  ...pluginVue.configs["flat/recommended"],

  // Apply TypeScript rules only to TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...tseslint.configs.recommended[0],
  },

  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
    },
  },

  {
    languageOptions: {
      globals: {
        // Node.js globals
        global: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        exports: "readonly",
        module: "readonly",
        require: "readonly",
        // Test globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
        vi: "readonly",
        vitest: "readonly",
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        indexedDB: "readonly",
        Blob: "readonly",
        requestIdleCallback: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        AbortController: "readonly",
        btoa: "readonly",
        atob: "readonly",
        Event: "readonly",
        performance: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        URLSearchParams: "readonly",
        URL: "readonly",
        alert: "readonly",
        navigator: "readonly",
        location: "readonly",
        // Vite specific
        import: "readonly",
      },
    },
    rules: {
      // Style rules - keep disabled for flexibility
      "vue/multi-word-component-names": "off",
      "vue/html-indent": "off",
      "vue/no-ref-as-operand": "off",
      "vue/html-closing-bracket-spacing": "off",
      "vue/multiline-html-element-content-newline": "off",

      // Code quality rules - enable as warnings to catch issues
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "vue/no-unused-components": "warn",
      "no-fallthrough": "warn",

      // TypeScript-specific rules - warnings for better code quality
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  },
];
