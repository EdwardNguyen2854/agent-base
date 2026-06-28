import type { AgentVersion } from "@agent-base/domain/agent.js";
import type { Project, ProjectSource } from "@agent-base/domain/project.js";
import {
  canUseEvidenceTools,
  type Run,
  type Task,
} from "@agent-base/domain/task-run.js";
import { describe, expect, it } from "vitest";
import {
  approveRunPlan,
  cancelTaskRun,
  createTask,
  startRun,
  type TaskRunRepository,
} from "../src/task-runs.js";

describe("createTask", () => {
  it("records selected ready Project Source revisions and explicit web permission", async () => {
    const repository = inMemoryRepository();
    const createdAt = new Date("2026-06-28T09:00:00.000Z");
    const task = await createTask(
      repository,
      {
        workspaceId: "workspace-1",
        projectId: "project-1",
        title: "Market assessment",
        goal: " Assess the market ",
        reportLanguage: " English ",
        selectedSourceIds: ["source-ready"],
        webResearch: false,
      },
      createdAt,
    );

    expect(task).toMatchObject({
      goal: "Assess the market",
      reportLanguage: "English",
      webResearch: false,
      selectedSources: [
        {
          sourceId: "source-ready",
          revisionId: "2026-06-27T10:00:00.000Z",
          name: "evidence.md",
        },
      ],
      createdAt,
    });
    expect(repository.tasks.get(task.id)).toEqual(task);
  });

  it("rejects a selected Project Source that is not ready", async () => {
    const repository = inMemoryRepository();
    const source = repository.sources.get("source-ready");
    if (!source) throw new Error("Test Source is missing");
    repository.sources.set("source-ready", {
      ...source,
      state: "processing",
    });

    await expect(
      createTask(repository, {
        workspaceId: "workspace-1",
        projectId: "project-1",
        goal: "Assess the market",
        reportLanguage: "English",
        selectedSourceIds: ["source-ready"],
        webResearch: true,
      }),
    ).rejects.toThrow(/must belong.*and be ready/i);
  });
});

describe("startRun", () => {
  it("snapshots inputs and generates a Research Plan before evidence is available", async () => {
    const repository = inMemoryRepository();
    const task = await createTask(repository, {
      workspaceId: "workspace-1",
      projectId: "project-1",
      goal: "Assess the market",
      reportLanguage: "English",
      selectedSourceIds: ["source-ready"],
      webResearch: true,
    });
    const researchPlan = {
      objective: "Assess the market",
      questions: ["What supports demand?"],
      evidenceStrategy: ["Search selected Project Sources"],
      boundaries: ["Do not use evidence before approval"],
    };
    const createdAt = new Date("2026-06-28T11:00:00.000Z");

    const run = await startRun(
      repository,
      { generate: async () => researchPlan },
      {
        taskId: task.id,
        agentVersionId: "version-1",
        modelIdentifier: "MiniMax-M2.1",
      },
      createdAt,
    );

    expect(run.state).toBe("awaiting_approval");
    expect(run.snapshot).toMatchObject({
      task: {
        projectId: "project-1",
        goal: "Assess the market",
        reportLanguage: "English",
        webResearch: true,
      },
      sources: task.selectedSources,
      agentVersion: { id: "version-1", number: 1 },
      modelIdentifier: "MiniMax-M2.1",
      effectivePermissions: { webSearch: true },
      effectiveLimits: repository.agentVersion.limits,
    });
    expect(run.researchPlan).toEqual(researchPlan);
    expect(canUseEvidenceTools(run)).toBe(false);
    expect(repository.runs.get(run.id)).toEqual(run);
    expect(run.snapshot.sources).not.toBe(task.selectedSources);
    expect(run.snapshot.agentVersion.limits).not.toBe(
      repository.agentVersion.limits,
    );
    researchPlan.questions.push("A later question");
    expect(run.researchPlan.questions).toEqual(["What supports demand?"]);
  });
});

describe("approveRunPlan", () => {
  it("records the Owner and timestamp and persists the unlocked Run", async () => {
    const repository = inMemoryRepository();
    const task = await createTask(repository, {
      workspaceId: "workspace-1",
      projectId: "project-1",
      goal: "Assess the market",
      reportLanguage: "English",
      selectedSourceIds: [],
      webResearch: false,
    });
    const run = await startRun(
      repository,
      {
        generate: async () => ({
          objective: task.goal,
          questions: ["What evidence is available?"],
          evidenceStrategy: ["Review selected Project Sources"],
          boundaries: ["Wait for Plan Approval"],
        }),
      },
      {
        taskId: task.id,
        agentVersionId: "version-1",
        modelIdentifier: "MiniMax-M2.1",
      },
    );
    const approvedAt = new Date("2026-06-28T12:00:00.000Z");

    const approved = await approveRunPlan(
      repository,
      run.id,
      "owner-1",
      approvedAt,
    );

    expect(approved.planApproval).toEqual({ ownerId: "owner-1", approvedAt });
    expect(canUseEvidenceTools(approved)).toBe(true);
    expect(repository.runs.get(run.id)).toEqual(approved);
  });
});

describe("cancelTaskRun", () => {
  it("persists terminal cancellation without Plan Approval", async () => {
    const repository = inMemoryRepository();
    const task = await createTask(repository, {
      workspaceId: "workspace-1",
      projectId: "project-1",
      goal: "Assess the market",
      reportLanguage: "English",
      selectedSourceIds: [],
      webResearch: true,
    });
    const run = await startRun(
      repository,
      {
        generate: async () => ({
          objective: task.goal,
          questions: ["What evidence is available?"],
          evidenceStrategy: ["Search the public web"],
          boundaries: ["Wait for Plan Approval"],
        }),
      },
      {
        taskId: task.id,
        agentVersionId: "version-1",
        modelIdentifier: "MiniMax-M2.1",
      },
    );
    const cancelledAt = new Date("2026-06-28T12:30:00.000Z");

    const cancelled = await cancelTaskRun(repository, run.id, cancelledAt);

    expect(cancelled).toMatchObject({
      state: "cancelled",
      cancelledAt,
    });
    expect(cancelled.planApproval).toBeUndefined();
    expect(canUseEvidenceTools(cancelled)).toBe(false);
    await expect(approveRunPlan(repository, run.id, "owner-1")).rejects.toThrow(
      /cannot approve/i,
    );
  });
});

function inMemoryRepository() {
  const project: Project = {
    id: "project-1",
    workspaceId: "workspace-1",
    name: "Research",
    description: "",
    createdAt: new Date("2026-06-27T09:00:00.000Z"),
  };
  const sources = new Map<string, ProjectSource>([
    [
      "source-ready",
      {
        id: "source-ready",
        projectId: project.id,
        name: "evidence.md",
        kind: "markdown",
        size: 100,
        state: "ready",
        uploadedAt: new Date("2026-06-27T10:00:00.000Z"),
      },
    ],
  ]);
  const tasks = new Map<string, Task>();
  const runs = new Map<string, Run>();
  const agentVersion: AgentVersion = {
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
  };
  const repository: TaskRunRepository & {
    tasks: typeof tasks;
    runs: typeof runs;
    sources: typeof sources;
    agentVersion: AgentVersion;
  } = {
    tasks,
    runs,
    sources,
    agentVersion,
    loadProject: async (id) => (id === project.id ? project : undefined),
    loadSources: async (ids) =>
      ids.flatMap((id) => {
        const source = sources.get(id);
        return source ? [source] : [];
      }),
    loadAgentVersion: async (id) =>
      id === agentVersion.id ? agentVersion : undefined,
    saveTask: async (task) => {
      tasks.set(task.id, task);
    },
    loadTask: async (id) => tasks.get(id),
    listTasks: async (workspaceId) =>
      [...tasks.values()].filter((task) => task.workspaceId === workspaceId),
    saveRun: async (run) => {
      runs.set(run.id, run);
    },
    loadRun: async (id) => runs.get(id),
    listRunsForTask: async (taskId) =>
      [...runs.values()].filter((run) => run.taskId === taskId),
  };
  return repository;
}
