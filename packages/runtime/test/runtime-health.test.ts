import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentBaseRuntime } from "../src/agent-base-runtime.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("runtime health", () => {
  it("reports every managed process as stopped before launch", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "agent-base-test-"));
    temporaryDirectories.push(directory);

    const health = await new AgentBaseRuntime(directory).health();

    expect(health).toMatchObject({
      status: "stopped",
      origin: "http://127.0.0.1:3210",
      services: {
        web: { status: "stopped" },
        worker: { status: "stopped" },
        database: { status: "unknown" },
      },
    });
  });
});
