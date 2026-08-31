const js = require("@eslint/js"); /* We're using CommonJS because your project uses CommonJS. */
const globals = require("globals"); /* This package provides predefined global identifiers for environments. */

/* This is the modern ESLint Flat Config structure. */
module.exports = [
  {
    ignores: [
      "node_modules/**",
      "logs/**",
      "uploads/**",
      "docs/**",
      "docker/**",
    ],
  },

  /* which provides ESLint's recommended JavaScript configuration or baseline.*/
  js.configs.recommended,

  {
    files: ["**/*.js"],

    languageOptions: {
      /* It simply tells ESLint what syntax it should parse/analyze. */
      ecmaVersion: "latest",
      /* So ESLint should understand: source type rather than assuming the application is an ES Module project. */
      sourceType: "commonjs",

      globals: {
        ...globals.node /* represents Node.js globals. */,
      },
    },

    rules: {
      "no-undef": "error",
      "no-unreachable": "error",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: ["tests/**/*.js"],

    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
