import type { RunLimits } from "./agent.js";

export type TaskId = string;
export type RunId = string;

export type SelectedSourceRevision = Readonly<{
  sourceId: string;
  revisionId: string;
  name: string;
}>;

export type Task = Readonly<{
  id: TaskId;
  workspaceId: string;
  projectId: string;
  title: string;
  goal: string;
  reportLanguage: string;
  selectedSources: readonly SelectedSourceRevision[];
  webResearch: boolean;
  state: "open";
  createdAt: Date;
}>;

export type RunState = "awaiting_approval" | "running" | "cancelled";

export type ResearchPlan = Readonly<{
  objective: string;
  questions: readonly string[];
  evidenceStrategy: readonly string[];
  boundaries: readonly string[];
}>;

export type RunSnapshot = Readonly<{
  task: Readonly<{
    workspaceId: string;
    projectId: string;
    title: string;
    goal: string;
    reportLanguage: string;
    webResearch: boolean;
  }>;
  sources: readonly Readonly<{
    sourceId: string;
    revisionId: string;
    name: string;
  }>[];
  agentVersion: Readonly<{
    id: string;
    agentId: string;
    number: number;
    purpose: string;
    instructions: string;
    researchMethod: string;
    reportRequirements: string;
    evidencePermissions: Readonly<{ webSearch: boolean }>;
    limits: RunLimits;
    publishedAt: Date;
    publishedBy: string;
  }>;
  modelIdentifier: string;
  effectivePermissions: Readonly<{ webSearch: boolean }>;
  effectiveLimits: RunLimits;
}>;

export type PlanApproval = Readonly<{
  ownerId: string;
  approvedAt: Date;
}>;

export type Run = Readonly<{
  id: RunId;
  taskId: TaskId;
  state: RunState;
  snapshot: RunSnapshot;
  researchPlan: ResearchPlan;
  planApproval?: PlanApproval;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
}>;

export class RunTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RunTransitionError";
  }
}

export function canUseEvidenceTools(run: Run): boolean {
  return run.state === "running" && run.planApproval !== undefined;
}

export function approveResearchPlan(
  run: Run,
  ownerId: string,
  approvedAt: Date,
): Run {
  if (run.state !== "awaiting_approval") {
    throw new RunTransitionError(
      `Cannot approve a Research Plan while Run is ${run.state}`,
    );
  }
  return {
    ...run,
    state: "running",
    planApproval: { ownerId, approvedAt },
    updatedAt: approvedAt,
  };
}

export function cancelRun(run: Run, cancelledAt: Date): Run {
  if (run.state === "cancelled") {
    throw new RunTransitionError(
      "Cannot cancel a Run that is already cancelled",
    );
  }
  return {
    ...run,
    state: "cancelled",
    cancelledAt,
    updatedAt: cancelledAt,
  };
}

export type TaskValidationError = Readonly<{
  field: "goal" | "reportLanguage";
  message: string;
}>;

export type TaskValidationResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; errors: readonly TaskValidationError[] }>;

export function validateTaskDetails(input: {
  readonly goal: string;
  readonly reportLanguage: string;
}): TaskValidationResult {
  const errors: TaskValidationError[] = [];
  if (!input.goal.trim())
    errors.push({ field: "goal", message: "is required" });
  if (!input.reportLanguage.trim()) {
    errors.push({ field: "reportLanguage", message: "is required" });
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
