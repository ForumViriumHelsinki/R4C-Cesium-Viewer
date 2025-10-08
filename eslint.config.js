import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";

export default [
  {
    name: "app/files-to-lint",
    files: ["**/*.{js,mjs,jsx,vue}"],
  },

  {
    name: "app/files-to-ignore",
    ignores: ["**/dist/**", "**/dist-ssr/**", "**/coverage/**"],
  },

  js.configs.recommended,
  ...pluginVue.configs["flat/recommended"],

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
        // Vite specific
        import: "readonly",
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "no-unused-vars": "off",
      "vue/html-indent": "off",
      "vue/no-ref-as-operand": "off",
      "vue/html-closing-bracket-spacing": "off",
      "vue/multiline-html-element-content-newline": "off",
      "vue/no-unused-components": "off",
      "no-fallthrough": "off",
    },
  },
];
