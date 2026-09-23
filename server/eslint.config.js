/*
 * @eslint/js provides ESLint's official recommended JavaScript rules.
 * We import it using require() because this project uses CommonJS.
 */
const js = require("@eslint/js");

// The "globals" package provides predefined global variables for environments such as Node.js.
const globals = require("globals");

/*
 * ESLint Flat Config
 * ------------------
 * Modern ESLint uses an array of configuration objects.
 * Each object can apply to different files or define
 * different parts of the ESLint configuration.
 */
module.exports = [
  /*
   * Files and directories listed here will be completely ignored by ESLint.
   * These are generated, external, or non-source directories
   * that we do not want ESLint to analyze.
   */
  {
    ignores: [
      "node_modules/**", // Third-party npm dependencies.
      "logs/**", // Generated application log files.
      "uploads/**", // User-uploaded files.
      "docs/**", // Documentation/generated documentation.
      "docker/**", // Docker configuration files.
    ],
  },

  /*
   * ESLint's official recommended JavaScript rules.
   * This gives us a useful baseline of common JavaScript
   * problems without manually configuring every rule.
   */
  js.configs.recommended,

  // This configuration applies to all JavaScript files.
  {
    files: ["**/*.js"],

    languageOptions: {
      /*
       * "latest" tells ESLint to understand the latest
       * ECMAScript syntax supported by ESLint.
       * This controls what JavaScript syntax ESLint understands.
       * It does NOT change the Node.js runtime version.
       */
      ecmaVersion: "latest",

      /*
       * Our backend uses CommonJS.
       * Examples:
       * const express = require("express");
       * module.exports = router;
       * Therefore ESLint should treat JavaScript files
       * as CommonJS rather than ES Modules.
       */
      sourceType: "commonjs",

      /*
       * Global variables provided by Node.js.
       * This allows ESLint to recognize variables such as:
       * process
       * Buffer
       * __dirname
       * __filename
       */
      globals: {
        ...globals.node,
      },
    },

    // Project-specific ESLint rules.
    rules: {
      /*
       * Detect variables or identifiers that are used
       * without being defined.
       * Example:
       * console.log(userName);
       * If userName was never defined, ESLint reports an error.
       */
      "no-undef": "error",

      /*
       * Detect code that can never be executed.
       * Example:
       * return;
       * console.log("This can never run");
       * The console.log() is unreachable.
       */
      "no-unreachable": "error",

      /*
       * Detect variables that are declared but never used.
       * We use "warn" instead of "error" because an unused variable
       * is useful feedback but should not necessarily fail the build.
       * argsIgnorePattern:
       * Function arguments beginning with "_" are considered
       * intentionally unused.
       * Example:
       * function middleware(req, res, _next) {
       *   ...
       * }
       * "_next" will not generate an unused-variable warning.
       * varsIgnorePattern:
       * Variables beginning with "_" follow the same convention.
       */
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },

  /*
   * Test-file-specific configuration.
   * This configuration applies only to JavaScript files
   * inside the "tests" directory.
   */
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      /*
       * Our project uses Vitest for testing.
       * We configured Vitest with:
       * globals: true
       * Therefore functions such as describe(), test(),
       * expect(), etc. are available globally inside test files.
       * ESLint does not automatically know about those globals,
       * so we explicitly tell ESLint that they exist.
       */
      globals: {
        /*
         * describe() groups related tests together.
         * Example:
         * describe("User Service", () => {});
         */
        describe: "readonly",

        // test() defines an individual test case.
        test: "readonly",

        /*
         * it() is another way to define a test case.
         * It is included because Vitest supports both:
         * test(...)
         * it(...)
         */
        it: "readonly",

        /*
         * expect() is used to make assertions.
         * Example:
         * expect(2 + 2).toBe(4);
         */
        expect: "readonly",

        /*
         * vi is Vitest's mocking/spying utility.
         * Example:
         * vi.fn()
         * vi.mock()
         * vi.spyOn()
         */
        vi: "readonly",

        // Runs once before all tests in the test file.
        beforeAll: "readonly",

        // Runs once after all tests in the test file.
        afterAll: "readonly",

        // Runs before each individual test.
        beforeEach: "readonly",

        // Runs after each individual test.
        afterEach: "readonly",
      },
    },
  },
];
