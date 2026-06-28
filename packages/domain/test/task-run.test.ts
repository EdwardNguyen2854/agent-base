import { describe, expect, it } from "vitest";
import {
  approveResearchPlan,
  cancelRun,
  canUseEvidenceTools,
  type Run,
  validateTaskDetails,
} from "../src/task-run.js";

describe("Task validation", () => {
  it("requires a goal and Report language", () => {
    expect(validateTaskDetails({ goal: " ", reportLanguage: "" })).toEqual({
      ok: false,
      errors: [
        { field: "goal", message: "is required" },
        { field: "reportLanguage", message: "is required" },
      ],
    });
  });
});

describe("Run cancellation", () => {
  it("is terminal and never unlocks evidence tools", () => {
    const cancelledAt = new Date("2026-06-28T10:00:00.000Z");
    const cancelled = cancelRun(awaitingApprovalRun(), cancelledAt);

    expect(cancelled.state).toBe("cancelled");
    expect(cancelled.cancelledAt).toEqual(cancelledAt);
    expect(canUseEvidenceTools(cancelled)).toBe(false);
    expect(() => approveResearchPlan(cancelled, "owner-1", new Date())).toThrow(
      /cannot approve/i,
    );
  });
});

describe("Research Plan approval", () => {
  it("keeps evidence tools locked until the Owner approves the plan", () => {
    const run = awaitingApprovalRun();

    expect(canUseEvidenceTools(run)).toBe(false);
    const approvedAt = new Date("2026-06-28T10:00:00.000Z");
    const approved = approveResearchPlan(run, "owner-1", approvedAt);

    expect(approved.state).toBe("running");
    expect(approved.planApproval).toEqual({ ownerId: "owner-1", approvedAt });
    expect(canUseEvidenceTools(approved)).toBe(true);
  });
});

function awaitingApprovalRun(): Run {
  const now = new Date("2026-06-28T09:00:00.000Z");
  return {
    id: "run-1",
    taskId: "task-1",
    state: "awaiting_approval",
    snapshot: {
      task: {
        workspaceId: "workspace-1",
        projectId: "project-1",
        title: "Market assessment",
        goal: "Assess the market",
        reportLanguage: "English",
        webResearch: true,
      },
      sources: [],
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
        publishedAt: now,
        publishedBy: "owner-1",
      },
      modelIdentifier: "MiniMax-M2.1",
      effectivePermissions: { webSearch: true },
      effectiveLimits: {
        modelTurns: 20,
        tavilySearches: 10,
        pageFetches: 30,
        activeMinutes: 15,
      },
    },
    researchPlan: {
      objective: "Assess the market",
      questions: ["What evidence supports demand?"],
      evidenceStrategy: ["Search selected Project Sources"],
      boundaries: ["Use only approved evidence operations"],
    },
    createdAt: now,
    updatedAt: now,
  };
}
