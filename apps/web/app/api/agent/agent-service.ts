import {
  AgentDraftInvalidError,
  type AgentDraftUpdates,
  AgentNotFoundError,
  type AgentRepository,
  type AgentState,
  type AgentVersion,
  loadAgent,
  publishAgentVersion,
  updateAgentDraft,
} from "@agent-base/application/agent-publishing.js";

const AGENT_NOT_CONFIGURED = "Agent Base has not been initialized yet";

export type AgentEnvironment = Readonly<{
  databaseUrl: string;
  workspaceId: string;
  ownerId: string;
}>;

export type SerializedAgentState = {
  agent: { id: string; workspaceId: string; name: string };
  draft: ReturnType<typeof serializeDraft>;
  versions: ReturnType<typeof serializeVersion>[];
};

export type SerializedDraft = ReturnType<typeof serializeDraft>;
export type SerializedVersion = ReturnType<typeof serializeVersion>;

export function serializeDraft(draft: AgentState["draft"]) {
  return {
    purpose: draft.purpose,
    instructions: draft.instructions,
    researchMethod: draft.researchMethod,
    reportRequirements: draft.reportRequirements,
    evidencePermissions: draft.evidencePermissions,
    limits: draft.limits,
    updatedAt: draft.updatedAt.toISOString(),
  };
}

export function serializeVersion(version: AgentVersion) {
  return {
    number: version.number,
    purpose: version.purpose,
    instructions: version.instructions,
    researchMethod: version.researchMethod,
    reportRequirements: version.reportRequirements,
    evidencePermissions: version.evidencePermissions,
    limits: version.limits,
    publishedAt: version.publishedAt.toISOString(),
    publishedBy: version.publishedBy,
  };
}

export function serialize(state: AgentState): SerializedAgentState {
  return {
    agent: {
      id: state.agent.id,
      workspaceId: state.agent.workspaceId,
      name: state.agent.name,
    },
    draft: serializeDraft(state.draft),
    versions: state.versions.map(serializeVersion),
  };
}

export function isAgentDraftUpdates(
  value: unknown,
): value is AgentDraftUpdates {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.purpose !== undefined &&
    typeof candidate.purpose !== "string"
  ) {
    return false;
  }
  if (
    candidate.instructions !== undefined &&
    typeof candidate.instructions !== "string"
  ) {
    return false;
  }
  if (
    candidate.researchMethod !== undefined &&
    typeof candidate.researchMethod !== "string"
  ) {
    return false;
  }
  if (
    candidate.reportRequirements !== undefined &&
    typeof candidate.reportRequirements !== "string"
  ) {
    return false;
  }
  if (candidate.evidencePermissions !== undefined) {
    const permissions = candidate.evidencePermissions as Record<
      string,
      unknown
    >;
    if (
      permissions === null ||
      typeof permissions !== "object" ||
      typeof permissions.webSearch !== "boolean"
    ) {
      return false;
    }
  }
  if (candidate.limits !== undefined) {
    const limits = candidate.limits as Record<string, unknown>;
    if (limits === null || typeof limits !== "object") return false;
    for (const key of [
      "modelTurns",
      "tavilySearches",
      "pageFetches",
      "activeMinutes",
    ]) {
      if (limits[key] !== undefined && typeof limits[key] !== "number") {
        return false;
      }
    }
  }
  return true;
}

export type AgentOperationResult =
  | { ok: true; status: number; body: unknown }
  | { ok: false; status: number; error: string; limitErrors?: unknown };

export async function readAgent(
  repository: AgentRepository,
): Promise<AgentOperationResult> {
  try {
    const state = await loadAgent(repository);
    return { ok: true, status: 200, body: serialize(state) };
  } catch (error) {
    if (error instanceof AgentNotFoundError) {
      return { ok: false, status: 404, error: error.message };
    }
    throw error;
  }
}

export async function writeAgentDraft(
  repository: AgentRepository,
  body: unknown,
): Promise<AgentOperationResult> {
  if (!isAgentDraftUpdates(body)) {
    return {
      ok: false,
      status: 400,
      error: "Agent Draft updates have invalid fields",
    };
  }
  try {
    const draft = await updateAgentDraft(repository, body);
    return { ok: true, status: 200, body: { draft: serializeDraft(draft) } };
  } catch (error) {
    if (error instanceof AgentDraftInvalidError) {
      return {
        ok: false,
        status: 422,
        error: error.message,
        limitErrors: error.errors,
      };
    }
    if (error instanceof AgentNotFoundError) {
      return { ok: false, status: 404, error: error.message };
    }
    throw error;
  }
}

export async function publishAgent(
  repository: AgentRepository,
  ownerId: string,
): Promise<AgentOperationResult> {
  try {
    const version = await publishAgentVersion(repository, ownerId);
    return {
      ok: true,
      status: 201,
      body: { version: serializeVersion(version) },
    };
  } catch (error) {
    if (error instanceof AgentDraftInvalidError) {
      return {
        ok: false,
        status: 422,
        error: error.message,
        limitErrors: error.errors,
      };
    }
    if (error instanceof AgentNotFoundError) {
      return { ok: false, status: 404, error: error.message };
    }
    throw error;
  }
}

export function agentNotConfiguredResponse(): AgentOperationResult {
  return { ok: false, status: 503, error: AGENT_NOT_CONFIGURED };
}

export function readAgentEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): AgentEnvironment | undefined {
  const databaseUrl = env.DATABASE_URL;
  const workspaceId = env.AGENT_BASE_WORKSPACE_ID;
  const ownerId = env.AGENT_BASE_OWNER_ID;
  if (!databaseUrl || !workspaceId || !ownerId) return undefined;
  return { databaseUrl, workspaceId, ownerId };
}
