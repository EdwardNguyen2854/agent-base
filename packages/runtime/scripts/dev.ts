import path from "node:path";

process.env.AGENT_BASE_APP_ROOT = path.resolve(import.meta.dirname, "../../..");

await import("../src/cli.js");
