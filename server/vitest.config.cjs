const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    // Makes describe, test, expect, beforeEach, etc. available globally.
    globals: true,

    // Backend tests run in Node.js.
    environment: "node",
  },
});
