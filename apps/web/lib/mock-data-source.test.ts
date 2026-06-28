import { describe, expect, it } from "vitest";
import {
  renderReportMarkdown,
  seedState,
  validateUpload,
} from "./frontend-data";
import {
  MockFrontendDataSource,
  migrateStoredState,
  STORAGE_KEY,
} from "./mock-data-source";

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("MockFrontendDataSource", () => {
  it("migrates invalid or outdated persistence to the deterministic seed", () => {
    expect(migrateStoredState("not-json").schemaVersion).toBe(1);
    expect(
      migrateStoredState(JSON.stringify({ schemaVersion: 0 })).workspace.name,
    ).toBe("Northstar Research");
  });

  it("persists mutations without retaining Credential secrets", () => {
    const storage = new MemoryStorage();
    const source = new MockFrontendDataSource(storage);
    source.replaceCredential("Tavily", "tavily-super-secret");
    const persisted = storage.getItem(STORAGE_KEY) ?? "";
    expect(persisted).toContain("CRET");
    expect(persisted).not.toContain("tavily-super-secret");
  });

  it("rejects a credential shorter than 6 characters", () => {
    const source = new MockFrontendDataSource();
    expect(() => source.replaceCredential("MiniMax", "abc")).toThrow(
      /6 characters/i,
    );
  });

  it("accepts a credential of exactly 6 characters", () => {
    const source = new MockFrontendDataSource();
    source.replaceCredential("Tavily", "123456");
    const cred = source
      .getState()
      .credentials.find((c) => c.provider === "Tavily");
    expect(cred?.configured).toBe(true);
    expect(cred?.status).toBe("healthy");
  });

  it("enforces one active Run and releases queued work", () => {
    const source = new MockFrontendDataSource();
    source.approvePlan("run-2");
    const queued = source.createRun("task-1");
    expect(queued.state).toBe("queued");
    source.cancelRun("run-2");
    expect(
      source.getState().runs.find((run) => run.id === queued.id)?.state,
    ).toBe("awaiting_approval");
  });

  it("moves approved work through checkpoints into Report review", () => {
    const source = new MockFrontendDataSource();
    source.approvePlan("run-2");
    for (let step = 0; step < 3; step += 1) source.advanceRun("run-2");
    const run = source.getState().runs.find((item) => item.id === "run-2");
    expect(run?.state).toBe("succeeded");
    expect(run?.reportId).toBeTruthy();
    expect(
      source.getState().tasks.find((task) => task.id === "task-2")?.state,
    ).toBe("in_review");
  });

  it("requires revision feedback and allows exactly one accepted outcome", () => {
    const source = new MockFrontendDataSource();
    expect(() => source.reviseReport("report-1", " ")).toThrow(/feedback/i);
    source.acceptReport("report-1");
    expect(
      source.getState().tasks.find((task) => task.id === "task-1")?.state,
    ).toBe("completed");
    expect(() => source.acceptReport("report-1")).toThrow(/already/i);
  });

  it("restores a valid backup snapshot", () => {
    const source = new MockFrontendDataSource();
    const backup = source.exportBackup();
    source.createProject("Temporary Project", "Will be removed by restore");
    expect(source.getState().projects[0]?.name).toBe("Temporary Project");
    source.restoreBackup(backup);
    expect(
      source
        .getState()
        .projects.some((project) => project.name === "Temporary Project"),
    ).toBe(false);
    expect(() => source.restoreBackup("{}")).toThrow(/valid/i);
  });
});

describe("frontend helpers", () => {
  it("validates supported uploads, size, and extension", () => {
    expect(
      validateUpload({
        name: "evidence.pdf",
        size: 1024,
        type: "application/pdf",
      }),
    ).toEqual({ kind: "PDF" });
    expect(
      validateUpload({ name: "image.png", size: 1024, type: "image/png" })
        .error,
    ).toMatch(/unsupported/i);
    expect(
      validateUpload({
        name: "large.txt",
        size: 26 * 1024 * 1024,
        type: "text/plain",
      }).error,
    ).toMatch(/25 MB/i);
  });

  it("renders citation footnotes and a Source appendix in Markdown", () => {
    const report = seedState().reports[0];
    if (!report) throw new Error("Seed Report missing");
    const markdown = renderReportMarkdown(report);
    expect(markdown).toContain(`# ${report.title}`);
    expect(markdown).toContain("[^ex-1]");
    expect(markdown).toContain("## Source appendix");
    expect(markdown).toContain("Market landscape.md");
  });
});
