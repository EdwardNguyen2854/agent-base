import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["tests/acceptance/**", "**/node_modules/**", "**/dist/**"],
  },
});
