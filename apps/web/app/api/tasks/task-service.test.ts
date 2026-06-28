import type { RunSnapshot } from "@agent-base/application/task-runs.js";
import { describe, expect, it } from "vitest";
import { researchPlanGenerator } from "./task-service";

describe("researchPlanGenerator", () => {
  it("generates a bounded Plan from the immutable Run snapshot", async () => {
    const plan = await researchPlanGenerator.generate(runSnapshot());

    expect(plan.objective).toBe("Assess the market");
    expect(plan.evidenceStrategy).toEqual([
      "Review the selected Project Sources",
    ]);
    expect(plan.boundaries).toContain(
      "Evidence operations remain unavailable until Plan Approval",
    );
    expect(plan.boundaries).toContain("Write the Report in Vietnamese");
  });
});

function runSnapshot(): RunSnapshot {
  return {
    task: {
      workspaceId: "workspace-1",
      projectId: "project-1",
      title: "Market assessment",
      goal: "Assess the market",
      reportLanguage: "Vietnamese",
      webResearch: false,
    },
    sources: [
      {
        sourceId: "source-1",
        revisionId: "2026-06-27T10:00:00.000Z",
        name: "evidence.md",
      },
    ],
    agentVersion: {
      id: "version-1",
      agentId: "agent-1",
      number: 1,
      purpose: "Research",
      instructions: "Use evidence",
      researchMethod: "Triangulate",
      reportRequirements: "Cite claims",
      evidencePermissions: { webSearch: true },
      limits: {
        modelTurns: 20,
        tavilySearches: 10,
        pageFetches: 30,
        activeMinutes: 15,
      },
      publishedAt: new Date("2026-06-27T08:00:00.000Z"),
      publishedBy: "owner-1",
    },
    modelIdentifier: "MiniMax-M2.1",
    effectivePermissions: { webSearch: false },
    effectiveLimits: {
      modelTurns: 20,
      tavilySearches: 10,
      pageFetches: 30,
      activeMinutes: 15,
    },
  };
}
