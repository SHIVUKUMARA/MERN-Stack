# ESLint Configuration

This project uses **ESLint with the modern Flat Config system** to perform static analysis on the Node.js backend.

The backend uses:

* Node.js
* CommonJS
* JavaScript
* Jest for testing

ESLint is used to identify potential problems such as:

* Undefined variables
* Unreachable code
* Unused variables
* Other recommended JavaScript issues

---

## Installation

Install the required development dependencies:

```bash
npm install --save-dev eslint @eslint/js globals
```

### Packages

| Package      | Purpose                                                               |
| ------------ | --------------------------------------------------------------------- |
| `eslint`     | ESLint engine and command-line tool                                   |
| `@eslint/js` | Official ESLint JavaScript configurations and recommended rules       |
| `globals`    | Provides predefined globals for environments such as Node.js and Jest |

---

# Configuration File

The ESLint configuration is located at:

```text
eslint.config.js
```

Current configuration:

```js
const js = require("@eslint/js");
const globals = require("globals");

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

  js.configs.recommended,

  {
    files: ["**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",

      globals: {
        ...globals.node,
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
```

---

# Configuration Structure

The configuration uses ESLint's modern **Flat Config** format.

```text
eslint.config.js
│
├── Ignored files and directories
│
├── ESLint recommended JavaScript rules
│
├── Backend JavaScript configuration
│   ├── JavaScript version
│   ├── CommonJS
│   ├── Node.js globals
│   └── Project rules
│
└── Test configuration
    └── Jest globals
```

Each configuration block can apply to different files.

---

# Ignored Directories

The following directories are ignored by ESLint:

```js
ignores: [
  "node_modules/**",
  "logs/**",
  "uploads/**",
  "docs/**",
  "docker/**",
],
```

## `node_modules/**`

Third-party dependencies are ignored because they are not part of the project's source code.

```text
node_modules/
```

---

## `logs/**`

Generated application logs are not source code and should not be analyzed.

```text
logs/
```

---

## `uploads/**`

Uploaded files are user-generated content and should not be linted.

```text
uploads/
```

---

## `docs/**`

Documentation files and generated documentation are excluded from JavaScript linting.

```text
docs/
```

---

## `docker/**`

Docker configuration files and Docker-related files are excluded from this ESLint configuration.

```text
docker/
```

---

# ESLint Recommended Rules

The configuration uses:

```js
js.configs.recommended
```

This provides ESLint's recommended JavaScript rules.

These rules help detect common JavaScript problems such as:

* Undefined variables
* Invalid JavaScript patterns
* Unreachable code
* Other potentially incorrect code

The recommended configuration acts as the baseline for the project.

```text
ESLint Recommended Rules
            +
Project-Specific Rules
            =
Final ESLint Policy
```

---

# JavaScript Files

The following configuration applies to all JavaScript files:

```js
files: ["**/*.js"]
```

This includes backend source files such as:

```text
config/
controllers/
core/
database/
middleware/
models/
routes/
services/
utils/
```

---

# ECMAScript Version

The project uses:

```js
ecmaVersion: "latest"
```

This tells ESLint to understand modern JavaScript syntax.

```text
ecmaVersion
      ↓
JavaScript syntax ESLint can parse and analyze
```

This does not change the Node.js runtime.

The installed Node.js version still determines what JavaScript features can actually execute.

---

# CommonJS

The backend uses CommonJS.

```js
sourceType: "commonjs"
```

The project uses patterns such as:

```js
const express = require("express");
```

and:

```js
module.exports = router;
```

Therefore ESLint is configured to understand CommonJS rather than assuming the project uses ES Modules.

---

# Node.js Globals

The backend uses Node.js globals.

The configuration includes:

```js
globals: {
  ...globals.node,
},
```

This allows ESLint to recognize Node.js global identifiers.

Examples include:

```js
process;
Buffer;
__dirname;
__filename;
```

For example:

```js
const port = process.env.PORT;
```

ESLint understands that `process` is provided by the Node.js environment.

---

# Project Rules

The project currently defines the following additional rules.

---

## `no-undef`

```js
"no-undef": "error"
```

This detects variables or identifiers that are used without being defined.

Example:

```js
const user = getUsr();
```

If `getUsr` does not exist, ESLint reports an error.

Severity:

```text
error
```

This means the issue can fail the lint command and therefore fail CI.

---

## `no-unreachable`

```js
"no-unreachable": "error"
```

This detects code that cannot be executed.

Example:

```js
function getUser() {
  return user;

  console.log("This will never execute");
}
```

The `console.log()` statement is unreachable.

Severity:

```text
error
```

---

## `no-unused-vars`

```js
"no-unused-vars": [
  "warn",
  {
    argsIgnorePattern: "^_",
    varsIgnorePattern: "^_",
  },
],
```

This detects variables that are declared but never used.

Example:

```js
const user = await User.findById(id);
```

If `user` is never used, ESLint reports a warning.

Severity:

```text
warn
```

---

# Intentionally Unused Variables

The project follows an underscore convention for intentionally unused variables and function arguments.

Configuration:

```js
argsIgnorePattern: "^_",
varsIgnorePattern: "^_",
```

Example:

```js
function middleware(req, res, _next) {
  return res.json({
    message: "Success",
  });
}
```

Because `_next` starts with `_`, ESLint treats it as intentionally unused.

This convention should only be used when a variable or argument is genuinely intended to remain unused.

It should not be used simply to hide unnecessary code.

---

# Jest Test Configuration

Test files are matched using:

```js
files: ["tests/**/*.js"]
```

These files receive Jest globals:

```js
globals: {
  ...globals.jest,
},
```

This allows ESLint to understand Jest identifiers such as:

```js
describe();
test();
it();
expect();
beforeEach();
afterEach();
beforeAll();
afterAll();
jest;
```

Without Jest globals, ESLint could incorrectly report these identifiers as undefined.

Example:

```js
describe("User Service", () => {
  test("should return a user", () => {
    expect(true).toBe(true);
  });
});
```

---

# NPM Scripts

The project should contain the following scripts in `package.json`.

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

Do not remove existing scripts. Add these alongside them.

---

# Running ESLint

Run ESLint across the project:

```bash
npm run lint
```

Equivalent command:

```bash
eslint .
```

ESLint will:

```text
Find JavaScript files
        ↓
Load eslint.config.js
        ↓
Ignore configured directories
        ↓
Apply recommended rules
        ↓
Apply Node.js/CommonJS configuration
        ↓
Apply project rules
        ↓
Apply Jest configuration to test files
        ↓
Report problems
```

---

# Automatically Fixing Problems

Run:

```bash
npm run lint:fix
```

Equivalent command:

```bash
eslint . --fix
```

ESLint will automatically fix problems that have a supported automatic fix.

Example:

```js
let user = getUser();
```

If `user` is never reassigned and the applicable rule supports fixing it, ESLint may change it to:

```js
const user = getUser();
```

However:

```text
lint:fix
≠
fix every problem automatically
```

Some issues require developer decisions.

For example:

```js
const user = await User.findById(id);
```

If `user` is unused, ESLint cannot know whether you intended to:

* Use the user
* Return the user
* Delete the database query
* Perform additional logic

Therefore such issues usually require manual fixes.

---

# Recommended Workflow

Use the following workflow during development:

```text
Write Code
    ↓
npm run lint
    ↓
Review Problems
    ↓
Fix Problems Manually
    ↓
npm run lint:fix
    ↓
Automatically Fix Supported Issues
    ↓
Review Changes
    ↓
npm run lint
    ↓
Confirm Project Passes
```

After running:

```bash
npm run lint:fix
```

review the changes before committing:

```bash
git diff
```

---

# ESLint in CI

CI should normally run:

```bash
npm run lint
```

rather than:

```bash
npm run lint:fix
```

The difference is:

```text
Local Development
        ↓
lint:fix
        ↓
Modify and fix code


CI
        ↓
lint
        ↓
Check whether code already follows the policy
```

CI should verify the repository rather than silently modifying files.

Example GitHub Actions step:

```yaml
- name: Lint
  run: npm run lint
```

If ESLint encounters errors, it returns a non-zero exit code.

```text
ESLint Error
      ↓
Non-zero Exit Code
      ↓
GitHub Actions Step Fails
      ↓
CI Fails
```

This makes ESLint part of the project's automated quality checks.

---

# Current ESLint Architecture

```text
                         Source Code
                              │
                              ▼
                           ESLint
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
       Application Code                    Test Code
              │                               │
              ▼                               ▼
       Node.js Globals                    Jest Globals
              │                               │
              └───────────────┬───────────────┘
                              ▼
                     Recommended Rules
                              +
                     Project-Specific Rules
                              │
                              ▼
                         Lint Result
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
                  PASS                Problems
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                         Auto-fixable         Manual Fix
```

---

# Current ESLint Policy Summary

| Area                           | Current Configuration                     |
| ------------------------------ | ----------------------------------------- |
| Configuration system           | Flat Config                               |
| Language                       | JavaScript                                |
| Module system                  | CommonJS                                  |
| Runtime environment            | Node.js                                   |
| Test environment               | Jest                                      |
| JavaScript version             | Latest supported ECMAScript               |
| Recommended rules              | Enabled                                   |
| Undefined variables            | Error                                     |
| Unreachable code               | Error                                     |
| Unused variables               | Warning                                   |
| Intentionally unused variables | Prefix with `_`                           |
| Ignored directories            | node_modules, logs, uploads, docs, docker |
| Automatic fixes                | Available through `npm run lint:fix`      |

---

# Future Improvements

The ESLint configuration can later be extended when required.

Possible additions include:

* Test-specific ESLint rules
* Node.js-specific ESLint rules
* Additional project quality rules
* Prettier compatibility
* TypeScript configuration if the project migrates to TypeScript
* Stricter CI policies

New rules or plugins should only be added when they provide clear value to the project.

The goal is:

```text
Useful Rules
     +
Low Noise
     +
Clear Developer Feedback
     =
Effective Code Quality Policy
```
