import { randomUUID } from "node:crypto";
import {
  type Agent,
  type AgentDraft,
  AgentDraftInvalidError,
  type AgentEvidencePermissions,
  type AgentId,
  type AgentVersion,
  type AgentVersionId,
  generalResearchAgentDraftFields,
  type OwnerId,
  type RunLimits,
  validateAgentDraft,
  type WorkspaceId,
} from "@agent-base/domain/agent.js";

export {
  AgentDraftInvalidError,
  AgentLimitsExceededError,
} from "@agent-base/domain/agent.js";

export type {
  Agent,
  AgentDraft,
  AgentEvidencePermissions,
  AgentId,
  AgentVersion,
  AgentVersionId,
  OwnerId,
  RunLimits,
  WorkspaceId,
};

export const GENERAL_RESEARCH_AGENT_ID: AgentId =
  "00000000-0000-4000-8000-000000000020";

export interface AgentState {
  agent: Agent;
  draft: AgentDraft;
  versions: readonly AgentVersion[];
}

export interface AgentRepository {
  loadAgent(): Promise<AgentState | undefined>;
  saveDraft(draft: AgentDraft): Promise<void>;
  appendVersion(version: AgentVersion): Promise<AgentVersion>;
}

export class AgentNotFoundError extends Error {
  constructor() {
    super("No Agent has been seeded yet");
    this.name = "AgentNotFoundError";
  }
}

export class AgentVersionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentVersionConflictError";
  }
}

export async function seedGeneralResearchAgent(
  repository: AgentRepository,
  workspaceId: WorkspaceId,
  ownerId: OwnerId,
): Promise<AgentState> {
  const existing = await repository.loadAgent();
  if (existing && existing.versions.length > 0) return existing;
  const now = new Date();
  const draft =
    existing?.draft ??
    createDraft({
      agentId: GENERAL_RESEARCH_AGENT_ID,
      workspaceId,
      updatedAt: now,
    });
  if (!existing) {
    await repository.saveDraft(draft);
  }
  const version = await repository.appendVersion(
    createVersion(draft, 1, ownerId, now),
  );
  if (existing) {
    return { ...existing, versions: [version] };
  }
  return {
    agent: {
      id: draft.agentId,
      workspaceId,
      name: "General research",
    },
    draft,
    versions: [version],
  };
}

export async function loadAgent(
  repository: AgentRepository,
): Promise<AgentState> {
  const state = await repository.loadAgent();
  if (!state) throw new AgentNotFoundError();
  return state;
}

export type AgentDraftUpdates = Readonly<{
  purpose?: string;
  instructions?: string;
  researchMethod?: string;
  reportRequirements?: string;
  evidencePermissions?: AgentEvidencePermissions;
  limits?: RunLimits;
}>;

export async function updateAgentDraft(
  repository: AgentRepository,
  updates: AgentDraftUpdates,
): Promise<AgentDraft> {
  const state = await loadAgent(repository);
  const nextLimits = updates.limits ?? state.draft.limits;
  const nextDraft: AgentDraft = {
    ...state.draft,
    ...(updates.purpose !== undefined ? { purpose: updates.purpose } : {}),
    ...(updates.instructions !== undefined
      ? { instructions: updates.instructions }
      : {}),
    ...(updates.researchMethod !== undefined
      ? { researchMethod: updates.researchMethod }
      : {}),
    ...(updates.reportRequirements !== undefined
      ? { reportRequirements: updates.reportRequirements }
      : {}),
    ...(updates.evidencePermissions !== undefined
      ? { evidencePermissions: updates.evidencePermissions }
      : {}),
    limits: nextLimits,
    updatedAt: new Date(),
  };
  const validation = validateAgentDraft(nextDraft);
  if (!validation.ok) {
    throw new AgentDraftInvalidError(validation.errors);
  }
  await repository.saveDraft(nextDraft);
  return nextDraft;
}

export async function publishAgentVersion(
  repository: AgentRepository,
  ownerId: OwnerId,
): Promise<AgentVersion> {
  const state = await loadAgent(repository);
  const validation = validateAgentDraft(state.draft);
  if (!validation.ok) {
    throw new AgentDraftInvalidError(validation.errors);
  }
  const highest = state.versions.reduce(
    (max, candidate) => Math.max(max, candidate.number),
    0,
  );
  const nextNumber = highest + 1;
  const version = createVersion(state.draft, nextNumber, ownerId, new Date());
  return repository.appendVersion(version);
}

export { generalResearchAgentDraftFields };

function createDraft(input: {
  agentId: AgentId;
  workspaceId: WorkspaceId;
  updatedAt: Date;
}): AgentDraft {
  const fields = generalResearchAgentDraftFields();
  return {
    id: randomUUID(),
    agentId: input.agentId,
    ...fields,
    updatedAt: input.updatedAt,
  };
}

function createVersion(
  draft: AgentDraft,
  number: number,
  ownerId: OwnerId,
  publishedAt: Date,
): AgentVersion {
  const id: AgentVersionId = randomUUID();
  return {
    id,
    agentId: draft.agentId,
    number,
    purpose: draft.purpose,
    instructions: draft.instructions,
    researchMethod: draft.researchMethod,
    reportRequirements: draft.reportRequirements,
    evidencePermissions: draft.evidencePermissions,
    limits: draft.limits,
    publishedAt,
    publishedBy: ownerId,
  };
}
