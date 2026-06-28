import { describe, expect, it } from "vitest";
import { seedState } from "../lib/frontend-data";
import { areaForPath, searchWorkspace } from "./navigation";

describe("product navigation", () => {
  it("keeps project work and report review under their parent areas", () => {
    expect(areaForPath("/tasks/task-1")).toBe("projects");
    expect(areaForPath("/projects/project-1/sources")).toBe("projects");
    expect(areaForPath("/reports/report-1")).toBe("runs");
    expect(areaForPath("/agents/agent-1")).toBe("harness");
  });

  it("searches the local frontend state without backend calls", () => {
    const state = seedState();
    expect(searchWorkspace(state, "market")[0]).toMatchObject({
      href: "/projects/project-1",
      kind: "Project",
    });
    expect(searchWorkspace(state, "governance").length).toBeGreaterThan(0);
    expect(searchWorkspace(state, "  ")).toEqual([]);
  });
});
