import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/acceptance",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3210",
    trace: "retain-on-failure",
  },
});
