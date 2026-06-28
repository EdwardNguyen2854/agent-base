import { randomUUID } from "node:crypto";
import {
  type AgentVersion,
  PLATFORM_LIMITS,
  type RunLimits,
} from "@agent-base/domain/agent.js";
import type { Project, ProjectSource } from "@agent-base/domain/project.js";
import type {
  ResearchPlan,
  Run,
  RunSnapshot,
  Task,
} from "@agent-base/domain/task-run.js";
import {
  approveResearchPlan,
  cancelRun as cancelDomainRun,
  validateTaskDetails,
} from "@agent-base/domain/task-run.js";

export type {
  ResearchPlan,
  Run,
  RunSnapshot,
  Task,
} from "@agent-base/domain/task-run.js";

export interface TaskRunRepository {
  loadProject(id: string): Promise<Project | undefined>;
  loadSources(ids: readonly string[]): Promise<readonly ProjectSource[]>;
  loadAgentVersion(id: string): Promise<AgentVersion | undefined>;
  saveTask(task: Task): Promise<void>;
  loadTask(id: string): Promise<Task | undefined>;
  listTasks(workspaceId: string): Promise<readonly Task[]>;
  saveRun(run: Run): Promise<void>;
  loadRun(id: string): Promise<Run | undefined>;
  listRunsForTask(taskId: string): Promise<readonly Run[]>;
}

export type CreateTaskInput = Readonly<{
  workspaceId: string;
  projectId: string;
  title?: string;
  goal: string;
  reportLanguage: string;
  selectedSourceIds: readonly string[];
  webResearch: boolean;
}>;

export interface ResearchPlanGenerator {
  generate(snapshot: RunSnapshot): Promise<ResearchPlan>;
}

export type StartRunInput = Readonly<{
  taskId: string;
  agentVersionId: string;
  modelIdentifier: string;
}>;

export async function createTask(
  repository: TaskRunRepository,
  input: CreateTaskInput,
  createdAt: Date = new Date(),
): Promise<Task> {
  const validation = validateTaskDetails(input);
  if (!validation.ok) {
    throw new Error(
      validation.errors
        .map((error) => `${error.field} ${error.message}`)
        .join("; "),
    );
  }
  const project = await repository.loadProject(input.projectId);
  if (!project || project.workspaceId !== input.workspaceId) {
    throw new Error(`Project ${input.projectId} not found`);
  }
  const uniqueSourceIds = [...new Set(input.selectedSourceIds)];
  const sources = await repository.loadSources(uniqueSourceIds);
  const byId = new Map(sources.map((source) => [source.id, source]));
  const selectedSources = uniqueSourceIds.map((sourceId) => {
    const source = byId.get(sourceId);
    if (
      !source ||
      source.projectId !== project.id ||
      source.state !== "ready"
    ) {
      throw new Error(
        `Project Source ${sourceId} must belong to the Project and be ready`,
      );
    }
    return {
      sourceId: source.id,
      revisionId: source.uploadedAt.toISOString(),
      name: source.name,
    };
  });
  const goal = input.goal.trim();
  const task: Task = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    title: input.title?.trim() || goal.slice(0, 80),
    goal,
    reportLanguage: input.reportLanguage.trim(),
    selectedSources,
    webResearch: input.webResearch,
    state: "open",
    createdAt,
  };
  await repository.saveTask(task);
  return task;
}

export async function startRun(
  repository: TaskRunRepository,
  planGenerator: ResearchPlanGenerator,
  input: StartRunInput,
  createdAt: Date = new Date(),
): Promise<Run> {
  const task = await repository.loadTask(input.taskId);
  if (!task) throw new Error(`Task ${input.taskId} not found`);
  const agentVersion = await repository.loadAgentVersion(input.agentVersionId);
  if (!agentVersion) {
    throw new Error(`Agent Version ${input.agentVersionId} not found`);
  }
  const modelIdentifier = input.modelIdentifier.trim();
  if (!modelIdentifier) throw new Error("Model identifier is required");
  const snapshot: RunSnapshot = {
    task: {
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      title: task.title,
      goal: task.goal,
      reportLanguage: task.reportLanguage,
      webResearch: task.webResearch,
    },
    sources: task.selectedSources.map((source) => ({ ...source })),
    agentVersion: {
      id: agentVersion.id,
      agentId: agentVersion.agentId,
      number: agentVersion.number,
      purpose: agentVersion.purpose,
      instructions: agentVersion.instructions,
      researchMethod: agentVersion.researchMethod,
      reportRequirements: agentVersion.reportRequirements,
      evidencePermissions: { ...agentVersion.evidencePermissions },
      limits: { ...agentVersion.limits },
      publishedAt: agentVersion.publishedAt,
      publishedBy: agentVersion.publishedBy,
    },
    modelIdentifier,
    effectivePermissions: {
      webSearch: task.webResearch && agentVersion.evidencePermissions.webSearch,
    },
    effectiveLimits: effectiveLimits(agentVersion.limits),
  };
  const generatedPlan = await planGenerator.generate(snapshot);
  const researchPlan: ResearchPlan = {
    objective: generatedPlan.objective,
    questions: [...generatedPlan.questions],
    evidenceStrategy: [...generatedPlan.evidenceStrategy],
    boundaries: [...generatedPlan.boundaries],
  };
  const run: Run = {
    id: randomUUID(),
    taskId: task.id,
    state: "awaiting_approval",
    snapshot,
    researchPlan,
    createdAt,
    updatedAt: createdAt,
  };
  await repository.saveRun(run);
  return run;
}

function effectiveLimits(limits: RunLimits): RunLimits {
  return {
    modelTurns: Math.min(limits.modelTurns, PLATFORM_LIMITS.modelTurns),
    tavilySearches: Math.min(
      limits.tavilySearches,
      PLATFORM_LIMITS.tavilySearches,
    ),
    pageFetches: Math.min(limits.pageFetches, PLATFORM_LIMITS.pageFetches),
    activeMinutes: Math.min(
      limits.activeMinutes,
      PLATFORM_LIMITS.activeMinutes,
    ),
  };
}

export async function approveRunPlan(
  repository: TaskRunRepository,
  runId: string,
  ownerId: string,
  approvedAt: Date = new Date(),
): Promise<Run> {
  const run = await repository.loadRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  const approved = approveResearchPlan(run, ownerId, approvedAt);
  await repository.saveRun(approved);
  return approved;
}

export async function cancelTaskRun(
  repository: TaskRunRepository,
  runId: string,
  cancelledAt: Date = new Date(),
): Promise<Run> {
  const run = await repository.loadRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  const cancelled = cancelDomainRun(run, cancelledAt);
  await repository.saveRun(cancelled);
  return cancelled;
}

export async function loadTask(
  repository: TaskRunRepository,
  taskId: string,
): Promise<Task> {
  const task = await repository.loadTask(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);
  return task;
}

export async function listTasks(
  repository: TaskRunRepository,
  workspaceId: string,
): Promise<readonly Task[]> {
  return repository.listTasks(workspaceId);
}

export async function loadRun(
  repository: TaskRunRepository,
  runId: string,
): Promise<Run> {
  const run = await repository.loadRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  return run;
}

export async function listRunsForTask(
  repository: TaskRunRepository,
  taskId: string,
): Promise<readonly Run[]> {
  return repository.listRunsForTask(taskId);
}
